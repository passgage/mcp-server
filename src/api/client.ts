import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  ApiClientConfig, 
  PassgageResponse, 
  PassgageErrorResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  QueryParams,
  ApiRequestConfig
} from '../types/api.js';

export class PassgageAPIClient {
  private client: AxiosInstance;
  private jwtToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
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
        if (this.jwtToken && !config.headers['Authorization']?.toString().includes('Bearer')) {
          config.headers['Authorization'] = `Bearer ${this.jwtToken}`;
        }
        
        if (this.config.debug) {
          console.log(`[Passgage API] ${config.method?.toUpperCase()} ${config.url}`, {
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
          console.error('[Passgage API] Error:', error.response?.data || error.message);
        }
        
        if (error.response?.status === 401 && this.jwtToken) {
          this.jwtToken = null;
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
        this.jwtToken = response.data.data.token;
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
        this.jwtToken = response.data.data.token;
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
      
      this.jwtToken = null;
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
    if (error.response?.data) {
      const errorData: PassgageErrorResponse = error.response.data;
      const message = errorData.message || 'API request failed';
      const details = errorData.errors?.map(e => `${e.field_name}: ${e.messages.join(', ')}`).join('; ') || '';
      return new Error(`${message}${details ? ` - ${details}` : ''}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('Unable to connect to Passgage API. Please check the base URL and network connection.');
    }
    
    return new Error(error.message || 'Unknown API error occurred');
  }

  isAuthenticated(): boolean {
    return !!this.jwtToken || !!this.config.apiKey;
  }

  getToken(): string | null {
    return this.jwtToken;
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  }

  disconnect(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.jwtToken = null;
  }
}