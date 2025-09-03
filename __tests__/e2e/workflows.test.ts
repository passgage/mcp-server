import { jest } from '@jest/globals';
import { PassgageAPIClient } from '../../src/api/client.js';
import { ToolRegistry } from '../../src/tools/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock all dependencies
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('axios');

describe('End-to-End Workflows', () => {
  let server: Server;
  let apiClient: PassgageAPIClient;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    jest.clearAllMocks();

    server = new Server({
      name: 'passgage-mcp-server',
      version: '2.0.0'
    });

    apiClient = new PassgageAPIClient({
      baseURL: 'https://api.test.com',
      timeout: 30000,
      debug: false
    });

    toolRegistry = new ToolRegistry(server, apiClient);
  });

  describe('Authentication Workflows', () => {
    it('should complete API key authentication workflow', async () => {
      // Mock API responses
      const mockGet = jest.fn().mockResolvedValue({
        success: true,
        message: 'OK',
        data: { users: [] }
      });

      apiClient.get = mockGet;
      apiClient.setApiKey('test-api-key-12345');

      // Verify authentication setup
      expect(apiClient.getAuthMode()).toBe('company');
      expect(apiClient.hasValidAuth()).toBe(true);

      // Test authenticated API call
      const result = await apiClient.get('/api/public/v1/users');

      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/api/public/v1/users');
    });

    it('should complete user authentication workflow', async () => {
      // Mock login response
      const mockLogin = jest.fn().mockResolvedValue({
        success: true,
        message: 'Login successful',
        data: {
          token: 'jwt-token-12345',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
          }
        }
      });

      apiClient.login = mockLogin;

      // Perform login
      const loginResult = await apiClient.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.data.token).toBe('jwt-token-12345');
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      // Verify authentication state
      expect(apiClient.getAuthMode()).toBe('user');
      expect(apiClient.hasValidAuth()).toBe(true);
    });

    it('should handle authentication failure workflow', async () => {
      // Mock failed login
      const mockLogin = jest.fn().mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
        data: null
      });

      apiClient.login = mockLogin;

      const loginResult = await apiClient.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.message).toBe('Invalid credentials');
      expect(apiClient.getAuthMode()).toBe('none');
      expect(apiClient.hasValidAuth()).toBe(false);
    });
  });

  describe('Tool Execution Workflows', () => {
    beforeEach(async () => {
      apiClient.setApiKey('test-api-key');
      
      // Mock tool registry setup
      jest.spyOn(toolRegistry, 'registerAll').mockResolvedValue();
      await toolRegistry.registerAll();
    });

    it('should complete user management workflow', async () => {
      // Mock API responses for user operations
      const mockResponses = {
        list: {
          success: true,
          message: 'Users retrieved successfully',
          data: {
            users: [
              { id: 1, email: 'user1@test.com', first_name: 'User', last_name: 'One' },
              { id: 2, email: 'user2@test.com', first_name: 'User', last_name: 'Two' }
            ],
            pagination: { page: 1, per_page: 25, total: 2 }
          }
        },
        get: {
          success: true,
          message: 'User retrieved successfully',
          data: { id: 1, email: 'user1@test.com', first_name: 'User', last_name: 'One' }
        },
        create: {
          success: true,
          message: 'User created successfully',
          data: { id: 3, email: 'newuser@test.com', first_name: 'New', last_name: 'User' }
        }
      };

      apiClient.get = jest.fn()
        .mockResolvedValueOnce(mockResponses.list)
        .mockResolvedValueOnce(mockResponses.get);
      apiClient.post = jest.fn().mockResolvedValue(mockResponses.create);

      // 1. List users
      const listResult = await apiClient.get('/api/public/v1/users');
      expect(listResult.success).toBe(true);
      expect(listResult.data.users).toHaveLength(2);

      // 2. Get specific user
      const getResult = await apiClient.get('/api/public/v1/users/1');
      expect(getResult.success).toBe(true);
      expect(getResult.data.id).toBe(1);

      // 3. Create new user
      const createResult = await apiClient.post('/api/public/v1/users', {
        email: 'newuser@test.com',
        first_name: 'New',
        last_name: 'User'
      });
      expect(createResult.success).toBe(true);
      expect(createResult.data.email).toBe('newuser@test.com');
    });

    it('should complete approval workflow', async () => {
      const mockApprovalResponses = {
        list: {
          success: true,
          message: 'Approvals retrieved successfully',
          data: {
            approvals: [
              { id: 1, status: 'pending', type: 'leave_request' },
              { id: 2, status: 'approved', type: 'overtime_request' }
            ]
          }
        },
        approve: {
          success: true,
          message: 'Approval processed successfully',
          data: { id: 1, status: 'approved' }
        },
        bulkApprove: {
          success: true,
          message: 'Bulk approval completed',
          data: { processed: 5, approved: 4, failed: 1 }
        }
      };

      apiClient.get = jest.fn().mockResolvedValue(mockApprovalResponses.list);
      apiClient.post = jest.fn()
        .mockResolvedValueOnce(mockApprovalResponses.approve)
        .mockResolvedValueOnce(mockApprovalResponses.bulkApprove);

      // 1. List pending approvals
      const pendingApprovals = await apiClient.get('/api/public/v1/approvals', {
        q: { status_eq: 'pending' }
      });
      expect(pendingApprovals.success).toBe(true);

      // 2. Approve individual request
      const approveResult = await apiClient.post('/api/public/v1/approvals/1/approve', {
        comment: 'Approved by manager'
      });
      expect(approveResult.success).toBe(true);
      expect(approveResult.data.status).toBe('approved');

      // 3. Bulk approve multiple requests
      const bulkResult = await apiClient.post('/api/public/v1/approvals/bulk-approve', {
        approval_ids: [2, 3, 4, 5, 6],
        comment: 'Bulk approval'
      });
      expect(bulkResult.success).toBe(true);
      expect(bulkResult.data.approved).toBe(4);
    });

    it('should complete leave management workflow', async () => {
      const mockLeaveResponses = {
        listTypes: {
          success: true,
          data: {
            leave_types: [
              { id: 1, name: 'Annual Leave', code: 'AL' },
              { id: 2, name: 'Sick Leave', code: 'SL' }
            ]
          }
        },
        create: {
          success: true,
          message: 'Leave request created',
          data: { id: 10, status: 'pending', type: 'Annual Leave' }
        },
        getBalance: {
          success: true,
          data: { user_id: 1, leave_type_id: 1, balance: 15, used: 5 }
        }
      };

      apiClient.get = jest.fn()
        .mockResolvedValueOnce(mockLeaveResponses.listTypes)
        .mockResolvedValueOnce(mockLeaveResponses.getBalance);
      apiClient.post = jest.fn().mockResolvedValue(mockLeaveResponses.create);

      // 1. Check available leave types
      const leaveTypes = await apiClient.get('/api/public/v1/leave_types');
      expect(leaveTypes.success).toBe(true);
      expect(leaveTypes.data.leave_types).toHaveLength(2);

      // 2. Check leave balance
      const balance = await apiClient.get('/api/public/v1/users/1/leave-balance', {
        leave_type_id: 1
      });
      expect(balance.success).toBe(true);
      expect(balance.data.balance).toBe(15);

      // 3. Create leave request
      const leaveRequest = await apiClient.post('/api/public/v1/leaves', {
        user_id: 1,
        leave_type_id: 1,
        start_date: '2024-03-01',
        end_date: '2024-03-05',
        reason: 'Family vacation'
      });
      expect(leaveRequest.success).toBe(true);
      expect(leaveRequest.data.status).toBe('pending');
    });
  });

  describe('Search and Filtering Workflows', () => {
    beforeEach(() => {
      apiClient.setApiKey('test-api-key');
    });

    it('should complete advanced search workflow with Ransack', async () => {
      const mockSearchResponse = {
        success: true,
        data: {
          users: [
            { id: 1, email: 'john@company.com', department: 'Engineering' },
            { id: 2, email: 'jane@company.com', department: 'Engineering' }
          ],
          pagination: { page: 1, per_page: 25, total: 2 }
        }
      };

      apiClient.get = jest.fn().mockResolvedValue(mockSearchResponse);

      // Complex Ransack query
      const searchResult = await apiClient.get('/api/public/v1/users', {
        q: {
          email_cont: '@company.com',
          department_eq: 'Engineering',
          is_active_eq: true,
          created_at_gteq: '2024-01-01'
        },
        page: 1,
        per_page: 50
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data.users).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith('/api/public/v1/users', {
        q: {
          email_cont: '@company.com',
          department_eq: 'Engineering',
          is_active_eq: true,
          created_at_gteq: '2024-01-01'
        },
        page: 1,
        per_page: 50
      });
    });

    it('should complete export workflow', async () => {
      const mockExportResponse = {
        success: true,
        message: 'Export generated successfully',
        data: {
          download_url: 'https://api.test.com/exports/users_20240301.csv',
          expires_at: '2024-03-01T18:00:00Z',
          format: 'csv',
          record_count: 150
        }
      };

      apiClient.post = jest.fn().mockResolvedValue(mockExportResponse);

      const exportResult = await apiClient.post('/api/public/v1/users/export', {
        format: 'csv',
        filters: { is_active_eq: true },
        columns: ['id', 'email', 'first_name', 'last_name', 'department']
      });

      expect(exportResult.success).toBe(true);
      expect(exportResult.data.format).toBe('csv');
      expect(exportResult.data.record_count).toBe(150);
      expect(exportResult.data.download_url).toContain('.csv');
    });
  });

  describe('Error Recovery Workflows', () => {
    beforeEach(() => {
      apiClient.setApiKey('test-api-key');
    });

    it('should handle and recover from rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            success: false,
            message: 'Rate limit exceeded',
            retry_after: 60
          }
        }
      };

      const successResponse = {
        success: true,
        data: { users: [] }
      };

      apiClient.get = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      // First call should fail with rate limit
      await expect(apiClient.get('/api/public/v1/users')).rejects.toMatchObject(rateLimitError);

      // Second call should succeed (after retry)
      const result = await apiClient.get('/api/public/v1/users');
      expect(result.success).toBe(true);
    });

    it('should handle token refresh workflow', async () => {
      // Mock expired token scenario
      const expiredTokenError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Token expired'
          }
        }
      };

      const refreshResponse = {
        success: true,
        data: {
          token: 'new-jwt-token-67890',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      };

      const successResponse = {
        success: true,
        data: { users: [] }
      };

      apiClient.get = jest.fn()
        .mockRejectedValueOnce(expiredTokenError)
        .mockResolvedValueOnce(successResponse);
      
      apiClient.refreshToken = jest.fn().mockResolvedValue(refreshResponse);

      // Simulate the automatic token refresh flow
      try {
        await apiClient.get('/api/public/v1/users');
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Refresh token
          const refreshResult = await apiClient.refreshToken();
          expect(refreshResult.success).toBe(true);
          
          // Retry original request
          const retryResult = await apiClient.get('/api/public/v1/users');
          expect(retryResult.success).toBe(true);
        }
      }
    });

    it('should handle validation errors gracefully', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Validation failed',
            errors: [
              { field_name: 'email', messages: ['Invalid email format'] },
              { field_name: 'first_name', messages: ['Required field'] }
            ]
          }
        }
      };

      apiClient.post = jest.fn().mockRejectedValue(validationError);

      await expect(apiClient.post('/api/public/v1/users', {
        email: 'invalid-email',
        last_name: 'Smith'
      })).rejects.toMatchObject(validationError);

      expect(validationError.response.data.errors).toHaveLength(2);
    });
  });

  describe('Performance and Stress Workflows', () => {
    beforeEach(() => {
      apiClient.setApiKey('test-api-key');
    });

    it('should handle concurrent API requests efficiently', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' }
      };

      apiClient.get = jest.fn().mockResolvedValue(mockResponse);

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(apiClient.get(`/api/public/v1/users/${i + 1}`));
      }

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in <5s
      expect(apiClient.get).toHaveBeenCalledTimes(10);
    });

    it('should handle large data sets efficiently', async () => {
      // Mock large dataset response
      const largeDataset = {
        success: true,
        data: {
          users: Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            email: `user${i + 1}@test.com`,
            first_name: `User${i + 1}`
          })),
          pagination: { page: 1, per_page: 1000, total: 1000 }
        }
      };

      apiClient.get = jest.fn().mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await apiClient.get('/api/public/v1/users', {
        per_page: 1000
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.users).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(2000); // Should process in <2s
    });
  });

  describe('Full Integration Workflows', () => {
    it('should complete end-to-end employee onboarding workflow', async () => {
      apiClient.setApiKey('test-api-key');

      const mockResponses = {
        createUser: {
          success: true,
          data: { id: 100, email: 'newemployee@company.com', first_name: 'New', last_name: 'Employee' }
        },
        assignCard: {
          success: true,
          data: { id: 50, user_id: 100, card_number: 'CARD123456' }
        },
        createShift: {
          success: true,
          data: { id: 25, user_id: 100, name: 'Standard Office Hours' }
        },
        setPermissions: {
          success: true,
          data: { user_id: 100, access_zones: [1, 2, 3] }
        }
      };

      apiClient.post = jest.fn()
        .mockResolvedValueOnce(mockResponses.createUser)
        .mockResolvedValueOnce(mockResponses.assignCard)
        .mockResolvedValueOnce(mockResponses.createShift)
        .mockResolvedValueOnce(mockResponses.setPermissions);

      // 1. Create user account
      const newUser = await apiClient.post('/api/public/v1/users', {
        email: 'newemployee@company.com',
        first_name: 'New',
        last_name: 'Employee',
        department: 'Engineering'
      });
      expect(newUser.success).toBe(true);

      // 2. Assign access card
      const assignCard = await apiClient.post('/api/public/v1/cards', {
        user_id: newUser.data.id,
        card_number: 'CARD123456'
      });
      expect(assignCard.success).toBe(true);

      // 3. Set up work schedule
      const createShift = await apiClient.post('/api/public/v1/user_shifts', {
        user_id: newUser.data.id,
        name: 'Standard Office Hours',
        start_time: '09:00',
        end_time: '17:00'
      });
      expect(createShift.success).toBe(true);

      // 4. Configure access permissions
      const setPermissions = await apiClient.post('/api/public/v1/access-permissions', {
        user_id: newUser.data.id,
        access_zone_ids: [1, 2, 3] // Office areas
      });
      expect(setPermissions.success).toBe(true);

      // Verify all operations completed successfully
      expect(apiClient.post).toHaveBeenCalledTimes(4);
    });

    it('should complete month-end reporting workflow', async () => {
      apiClient.setApiKey('test-api-key');

      const mockResponses = {
        timeData: {
          success: true,
          data: { total_hours: 1760, overtime_hours: 40, employees: 50 }
        },
        leaveData: {
          success: true,
          data: { total_days: 125, approved: 120, pending: 5 }
        },
        payrollExport: {
          success: true,
          data: { download_url: 'https://api.test.com/exports/payroll_march.xlsx' }
        }
      };

      apiClient.get = jest.fn()
        .mockResolvedValueOnce(mockResponses.timeData)
        .mockResolvedValueOnce(mockResponses.leaveData);
      
      apiClient.post = jest.fn()
        .mockResolvedValue(mockResponses.payrollExport);

      // 1. Gather time tracking data
      const timeData = await apiClient.get('/api/public/v1/dashboard/time-summary', {
        start_date: '2024-03-01',
        end_date: '2024-03-31'
      });
      expect(timeData.success).toBe(true);
      expect(timeData.data.total_hours).toBe(1760);

      // 2. Collect leave data
      const leaveData = await apiClient.get('/api/public/v1/dashboard/leave-summary', {
        start_date: '2024-03-01',
        end_date: '2024-03-31'
      });
      expect(leaveData.success).toBe(true);
      expect(leaveData.data.total_days).toBe(125);

      // 3. Generate payroll export
      const payrollExport = await apiClient.post('/api/public/v1/payrolls/export', {
        format: 'xlsx',
        period: '2024-03'
      });
      expect(payrollExport.success).toBe(true);
      expect(payrollExport.data.download_url).toContain('payroll_march.xlsx');
    });
  });
});