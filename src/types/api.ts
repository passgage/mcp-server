export interface PassgageResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  meta?: {
    current_page: number;
    total_pages: number;
    total_count: number;
  };
  errors?: string[];
}

export interface PassgageError {
  field_name: string;
  messages: string[];
}

export interface PassgageErrorResponse {
  success: false;
  status: number;
  message: string;
  errors: PassgageError[];
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  expires_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    company: {
      id: string;
      name: string;
    };
  };
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface FilterParams {
  [key: string]: any;
}

export interface QueryParams extends PaginationParams {
  q?: FilterParams;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  gsm?: string;
  is_active: boolean;
  company_id: string;
  department_id?: string;
  job_position_id?: string;
  branch_id?: string;
  user_device_ids?: string[];
  user_zone_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  approvable_type: string;
  approvable_id: string;
  approver_id?: string;
  requested_by_id: string;
  approved_at?: string;
  rejected_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_hourly_leave: boolean;
  total_days: number;
  total_hours?: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  company_id: string;
  branch_group_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  company_id: string;
  parent_department_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  is_night_shift: boolean;
  break_duration?: number;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  device_type: string;
  serial_number?: string;
  ip_address?: string;
  location?: string;
  is_active: boolean;
  company_id: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  presigned_url?: string;
}

export interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  debug?: boolean;
}

export type AuthMode = 'company' | 'user' | 'none';

export interface AuthContext {
  mode: AuthMode;
  companyApiKey?: string;
  userJwtToken?: string;
  userInfo?: {
    id: string;
    email: string;
    full_name: string;
    company: {
      id: string;
      name: string;
    };
  };
  tokenExpiresAt?: string;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestConfig {
  url: string;
  method: ApiMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export const PASSGAGE_SERVICES = [
  'users',
  'approvals',
  'approval_flows',
  'access_zones',
  'assignment_requests',
  'branches',
  'branch_groups',
  'cards',
  'departments',
  'devices',
  'entrances',
  'holidays',
  'job_positions',
  'leaves',
  'leave_rules',
  'leave_types',
  'night_works',
  'organization_units',
  'shifts',
  'slacks',
  'sub_companies',
  'user_rates',
  'user_shifts',
  'working_days',
  'payrolls',
  'user_extra_works',
  'shift_settings'
] as const;

export type PassgageService = typeof PASSGAGE_SERVICES[number];

export interface ToolPermission {
  companyMode: boolean;
  userMode: boolean;
  description?: string;
}

export const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  // Admin-only operations (Company mode only)
  'users_create': { companyMode: true, userMode: false, description: 'Creating users requires admin privileges' },
  'users_update': { companyMode: true, userMode: false, description: 'Updating users requires admin privileges' },
  'users_delete': { companyMode: true, userMode: false, description: 'Deleting users requires admin privileges' },
  'departments_create': { companyMode: true, userMode: false, description: 'Managing departments requires admin privileges' },
  'departments_update': { companyMode: true, userMode: false, description: 'Managing departments requires admin privileges' },
  'departments_delete': { companyMode: true, userMode: false, description: 'Managing departments requires admin privileges' },
  'branches_create': { companyMode: true, userMode: false, description: 'Managing branches requires admin privileges' },
  'branches_update': { companyMode: true, userMode: false, description: 'Managing branches requires admin privileges' },
  'branches_delete': { companyMode: true, userMode: false, description: 'Managing branches requires admin privileges' },
  'devices_create': { companyMode: true, userMode: false, description: 'Managing devices requires admin privileges' },
  'devices_update': { companyMode: true, userMode: false, description: 'Managing devices requires admin privileges' },
  'devices_delete': { companyMode: true, userMode: false, description: 'Managing devices requires admin privileges' },
  'shifts_create': { companyMode: true, userMode: false, description: 'Managing shifts requires admin privileges' },
  'shifts_update': { companyMode: true, userMode: false, description: 'Managing shifts requires admin privileges' },
  'shifts_delete': { companyMode: true, userMode: false, description: 'Managing shifts requires admin privileges' },
  'payrolls_list': { companyMode: true, userMode: false, description: 'Accessing payroll data requires admin privileges' },
  'payrolls_get': { companyMode: true, userMode: false, description: 'Accessing payroll data requires admin privileges' },
  
  // Approval operations (Company mode preferred, User mode for own requests)
  'approvals_create': { companyMode: true, userMode: true, description: 'Can create approval requests' },
  'approvals_update': { companyMode: true, userMode: false, description: 'Updating approvals requires admin privileges' },
  'approvals_delete': { companyMode: true, userMode: false, description: 'Deleting approvals requires admin privileges' },
  'bulk_approve': { companyMode: true, userMode: false, description: 'Bulk operations require admin privileges' },
  
  // Read operations (Both modes allowed)
  'users_list': { companyMode: true, userMode: true, description: 'Can view user list' },
  'users_get': { companyMode: true, userMode: true, description: 'Can view user details' },
  'departments_list': { companyMode: true, userMode: true, description: 'Can view departments' },
  'branches_list': { companyMode: true, userMode: true, description: 'Can view branches' },
  'devices_list': { companyMode: true, userMode: true, description: 'Can view devices' },
  'shifts_list': { companyMode: true, userMode: true, description: 'Can view shifts' },
  'leaves_list': { companyMode: true, userMode: true, description: 'Can view leaves' },
  'approvals_list': { companyMode: true, userMode: true, description: 'Can view approvals' },
  
  // Personal operations (Both modes, but user mode limited to own data)
  'leaves_create': { companyMode: true, userMode: true, description: 'Can create leave requests' },
  'leaves_update': { companyMode: true, userMode: true, description: 'Can update own leave requests' },
  'entrances_list': { companyMode: true, userMode: true, description: 'Can view entrance records' },
  'user_shifts_list': { companyMode: true, userMode: true, description: 'Can view shift assignments' }
};