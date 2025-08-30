import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  ApiClientConfig, 
  PassgageResponse, 
  PassgageErrorResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  QueryParams,
  ApiRequestConfig,
  AuthMode,
  AuthContext
} from '../types/api.js';

export class PassgageAPIClient {
  private client: AxiosInstance;
  private authContext: AuthContext;
  private refreshTimer: NodeJS.Timeout | null = null;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
    
    // Initialize authentication context
    this.authContext = {
      mode: config.apiKey ? 'company' : 'none',
      companyApiKey: config.apiKey,
      userJwtToken: undefined,
      userInfo: undefined,
      tokenExpiresAt: undefined
    };
    
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    if (config.apiKey) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
    }

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        // Set authorization header based on current auth mode
        if (this.authContext.mode === 'user' && this.authContext.userJwtToken) {
          config.headers['Authorization'] = `Bearer ${this.authContext.userJwtToken}`;
        } else if (this.authContext.mode === 'company' && this.authContext.companyApiKey) {
          config.headers['Authorization'] = `Bearer ${this.authContext.companyApiKey}`;
        }
        
        if (this.config.debug) {
          const method = config.method ? config.method.toUpperCase() : 'UNKNOWN';
          console.log(`[Passgage API] ${method} ${config.url}`, {
            headers: config.headers,
            params: config.params,
            data: config.data
          });
        }
        
        return config;
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[Passgage API] Response ${response.status}`, response.data);
        }
        return response;
      },
      (error) => {
        if (this.config.debug) {
          const errorData = error.response && error.response.data ? error.response.data : error.message;
          console.error('[Passgage API] Error:', errorData);
        }
        
        if (error.response && error.response.status === 401 && this.authContext.mode === 'user') {
          this.authContext.userJwtToken = undefined;
          this.authContext.userInfo = undefined;
          this.authContext.tokenExpiresAt = undefined;
          if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: AuthLoginRequest): Promise<PassgageResponse<AuthLoginResponse>> {
    try {
      const response: AxiosResponse<PassgageResponse<AuthLoginResponse>> = await this.client.post(
        '/api/public/auth/login',
        credentials,
        { headers: { Authorization: undefined } }
      );

      if (response.data.success && response.data.data.token) {
        this.authContext.mode = 'user';
        this.authContext.userJwtToken = response.data.data.token;
        this.authContext.userInfo = response.data.data.user;
        this.authContext.tokenExpiresAt = response.data.data.expires_at;
        this.scheduleTokenRefresh(response.data.data.expires_at);
      }

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async refreshToken(): Promise<PassgageResponse<{ token: string; expires_at: string }>> {
    try {
      const response = await this.client.post('/api/public/auth/refresh');
      
      if (response.data.success && response.data.data.token) {
        this.authContext.userJwtToken = response.data.data.token;
        this.authContext.tokenExpiresAt = response.data.data.expires_at;
        this.scheduleTokenRefresh(response.data.data.expires_at);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<PassgageResponse<{}>> {
    try {
      const response = await this.client.delete('/api/public/auth/logout');
      
      this.authContext.userJwtToken = undefined;
      this.authContext.userInfo = undefined;
      this.authContext.tokenExpiresAt = undefined;
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private scheduleTokenRefresh(expiresAt: string): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const refreshTime = expiryTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch(console.error);
      }, refreshTime);
    }
  }

  async request<T = any>(config: ApiRequestConfig): Promise<PassgageResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        url: config.url,
        method: config.method,
        headers: config.headers,
        params: config.params,
        data: config.data
      };

      const response: AxiosResponse<PassgageResponse<T>> = await this.client.request(axiosConfig);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async get<T = any>(url: string, params?: QueryParams): Promise<PassgageResponse<T[]>> {
    return this.request<T[]>({
      url,
      method: 'GET',
      params: this.buildQueryParams(params)
    });
  }

  async getById<T = any>(url: string, id: string): Promise<PassgageResponse<T>> {
    return this.request<T>({
      url: `${url}/${id}`,
      method: 'GET'
    });
  }

  async post<T = any>(url: string, data: any): Promise<PassgageResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data
    });
  }

  async put<T = any>(url: string, id: string, data: any): Promise<PassgageResponse<T>> {
    return this.request<T>({
      url: `${url}/${id}`,
      method: 'PUT',
      data
    });
  }

  async patch<T = any>(url: string, id: string, data: any): Promise<PassgageResponse<T>> {
    return this.request<T>({
      url: `${url}/${id}`,
      method: 'PATCH',
      data
    });
  }

  async delete<T = any>(url: string, id: string): Promise<PassgageResponse<T>> {
    return this.request<T>({
      url: `${url}/${id}`,
      method: 'DELETE'
    });
  }

  private buildQueryParams(params?: QueryParams): Record<string, any> | undefined {
    if (!params) return undefined;

    const queryParams: Record<string, any> = {};

    if (params.page) queryParams.page = params.page;
    if (params.per_page) queryParams.per_page = Math.min(params.per_page, 50);

    if (params.q) {
      Object.entries(params.q).forEach(([key, value]) => {
        queryParams[`q[${key}]`] = value;
      });
    }

    return queryParams;
  }

  private handleError(error: any): Error {
    if (error.response && error.response.data) {
      const errorData: PassgageErrorResponse = error.response.data;
      const message = errorData.message ?? 'API request failed';
      const details = errorData.errors && errorData.errors.map ? 
        errorData.errors.map(e => `${e.field_name}: ${e.messages.join(', ')}`).join('; ') : '';
      return new Error(`${message}${details ? ` - ${details}` : ''}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('Unable to connect to Passgage API. Please check the base URL and network connection.');
    }
    
    return new Error(error.message ?? 'Unknown API error occurred');
  }

  // Authentication mode management
  getAuthMode(): AuthMode {
    return this.authContext.mode;
  }

  getAuthContext(): AuthContext {
    return { ...this.authContext };
  }

  setCompanyMode(apiKey: string): void {
    this.authContext.mode = 'company';
    this.authContext.companyApiKey = apiKey;
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  }

  switchToUserMode(): boolean {
    if (this.authContext.userJwtToken) {
      this.authContext.mode = 'user';
      return true;
    }
    return false;
  }

  switchToCompanyMode(): boolean {
    if (this.authContext.companyApiKey) {
      this.authContext.mode = 'company';
      return true;
    }
    return false;
  }

  // Legacy compatibility methods
  isAuthenticated(): boolean {
    return this.authContext.mode !== 'none' && (
      (this.authContext.mode === 'company' && !!this.authContext.companyApiKey) ||
      (this.authContext.mode === 'user' && !!this.authContext.userJwtToken)
    );
  }

  getToken(): string | null {
    if (this.authContext.mode === 'user') {
      return this.authContext.userJwtToken ?? null;
    } else if (this.authContext.mode === 'company') {
      return this.authContext.companyApiKey ?? null;
    }
    return null;
  }

  setApiKey(apiKey: string): void {
    this.setCompanyMode(apiKey);
  }

  disconnect(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.authContext = {
      mode: 'none',
      companyApiKey: undefined,
      userJwtToken: undefined,
      userInfo: undefined,
      tokenExpiresAt: undefined
    };
  }
}