import { PassgageAPIClient } from '../src/api/client.js';
import { ToolRegistry } from '../src/tools/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PASSGAGE_BASE_URL = 'https://api.passgage.com';
process.env.PASSGAGE_API_KEY = 'test-api-key';

describe('Service-Specific Tools', () => {
  let server: Server;
  let client: PassgageAPIClient;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    server = new Server({
      name: 'test-passgage-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    client = new PassgageAPIClient({ 
      baseURL: 'https://api.passgage.com',
      apiKey: 'test-api-key',
      timeout: 30000, 
      debug: false 
    });
    
    toolRegistry = new ToolRegistry(server, client);
  });

  describe('User Shifts Service Tools', () => {
    it('should register all user shifts tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check for user shifts CRUD operations
      expect(tools.has('passgage_list_user_shifts')).toBe(true);
      expect(tools.has('passgage_get_user_shift')).toBe(true);
      expect(tools.has('passgage_create_user_shift')).toBe(true);
      expect(tools.has('passgage_update_user_shift')).toBe(true);
      expect(tools.has('passgage_delete_user_shift')).toBe(true);
      
      // Check for specialized user shifts tools
      expect(tools.has('passgage_assign_shift_to_users')).toBe(true);
      expect(tools.has('passgage_get_user_shift_conflicts')).toBe(true);
    });

    it('should have valid schemas for user shifts tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const listUserShiftsTool = tools.get('passgage_list_user_shifts');
      expect(listUserShiftsTool).toBeDefined();
      
      const mcpTool = listUserShiftsTool!.toMCPTool();
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties).toHaveProperty('page');
      expect(mcpTool.inputSchema.properties).toHaveProperty('per_page');
      expect(mcpTool.inputSchema.properties).toHaveProperty('q');
    });

    it('should have conflict checking tool with proper schema', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const conflictTool = tools.get('passgage_get_user_shift_conflicts');
      expect(conflictTool).toBeDefined();
      
      const mcpTool = conflictTool!.toMCPTool();
      expect(mcpTool.inputSchema.properties).toHaveProperty('user_id');
      expect(mcpTool.inputSchema.properties).toHaveProperty('shift_id');
      expect(mcpTool.inputSchema.properties).toHaveProperty('start_date');
      expect(mcpTool.inputSchema.required).toContain('user_id');
      expect(mcpTool.inputSchema.required).toContain('shift_id');
    });
  });

  describe('Leaves Service Tools', () => {
    it('should register all leaves tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check for leaves CRUD operations
      expect(tools.has('passgage_list_leaves')).toBe(true);
      expect(tools.has('passgage_get_leave')).toBe(true);
      expect(tools.has('passgage_create_leave')).toBe(true);
      expect(tools.has('passgage_update_leave')).toBe(true);
      expect(tools.has('passgage_delete_leave')).toBe(true);
      
      // Check for leave-specific workflow tools
      expect(tools.has('passgage_approve_leave')).toBe(true);
      expect(tools.has('passgage_reject_leave')).toBe(true);
      expect(tools.has('passgage_get_leave_balance')).toBe(true);
    });

    it('should have approval workflow tools with proper schemas', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const approveTool = tools.get('passgage_approve_leave');
      expect(approveTool).toBeDefined();
      
      const approveSchema = approveTool!.toMCPTool();
      expect(approveSchema.inputSchema.properties).toHaveProperty('leave_id');
      expect(approveSchema.inputSchema.properties).toHaveProperty('approver_notes');
      expect(approveSchema.inputSchema.properties).toHaveProperty('partial_approval');
      expect(approveSchema.inputSchema.required).toContain('leave_id');
      
      const rejectTool = tools.get('passgage_reject_leave');
      expect(rejectTool).toBeDefined();
      
      const rejectSchema = rejectTool!.toMCPTool();
      expect(rejectSchema.inputSchema.properties).toHaveProperty('rejection_reason');
      expect(rejectSchema.inputSchema.required).toContain('rejection_reason');
    });

    it('should have leave balance tool with user filtering', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const balanceTool = tools.get('passgage_get_leave_balance');
      expect(balanceTool).toBeDefined();
      
      const schema = balanceTool!.toMCPTool();
      expect(schema.inputSchema.properties).toHaveProperty('user_id');
      expect(schema.inputSchema.properties).toHaveProperty('leave_type_id');
      expect(schema.inputSchema.properties).toHaveProperty('year');
      expect(schema.inputSchema.required).toContain('user_id');
    });
  });

  describe('Leave Types Service Tools', () => {
    it('should register all leave types tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check for leave types CRUD operations
      expect(tools.has('passgage_list_leave_types')).toBe(true);
      expect(tools.has('passgage_get_leave_type')).toBe(true);
      expect(tools.has('passgage_create_leave_type')).toBe(true);
      expect(tools.has('passgage_update_leave_type')).toBe(true);
      expect(tools.has('passgage_delete_leave_type')).toBe(true);
      
      // Check for entitlement management tools
      expect(tools.has('passgage_get_leave_type_entitlements')).toBe(true);
      expect(tools.has('passgage_set_user_leave_entitlement')).toBe(true);
    });

    it('should have create leave type tool with comprehensive schema', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const createTool = tools.get('passgage_create_leave_type');
      expect(createTool).toBeDefined();
      
      const schema = createTool!.toMCPTool();
      expect(schema.inputSchema.properties).toHaveProperty('name');
      expect(schema.inputSchema.properties).toHaveProperty('code');
      expect(schema.inputSchema.properties).toHaveProperty('is_paid');
      expect(schema.inputSchema.properties).toHaveProperty('requires_approval');
      expect(schema.inputSchema.properties).toHaveProperty('can_be_half_day');
      expect(schema.inputSchema.properties).toHaveProperty('carry_over_allowed');
      expect(schema.inputSchema.properties).toHaveProperty('advance_notice_days');
      expect(schema.inputSchema.required).toContain('name');
      expect(schema.inputSchema.required).toContain('code');
    });

    it('should have entitlement management tools with proper permissions', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const entitlementTool = tools.get('passgage_set_user_leave_entitlement');
      expect(entitlementTool).toBeDefined();
      
      const metadata = entitlementTool!.getMetadata();
      expect(metadata.permissions?.companyMode).toBe(true);
      expect(metadata.permissions?.userMode).toBe(false); // Administrative function
      
      const schema = entitlementTool!.toMCPTool();
      expect(schema.inputSchema.properties).toHaveProperty('entitled_days');
      expect(schema.inputSchema.properties).toHaveProperty('effective_date');
    });
  });

  describe('Cross-Service Integration', () => {
    it('should register more than 50 total tools', async () => {
      await toolRegistry.registerAll();
      const toolCount = toolRegistry.getToolCount();
      expect(toolCount).toBeGreaterThan(50); // Should have 51+ tools now
    });

    it('should have tools from all major categories', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      const toolNames = Array.from(tools.keys());
      
      // Count tools by category
      const authTools = toolNames.filter(name => name.includes('auth') || name.includes('login') || name.includes('logout'));
      const userTools = toolNames.filter(name => name.includes('user') && !name.includes('shift'));
      const approvalTools = toolNames.filter(name => name.includes('approval'));
      const fileTools = toolNames.filter(name => name.includes('file') || name.includes('upload'));
      const searchTools = toolNames.filter(name => name.includes('search') || name.includes('ransack'));
      const shiftTools = toolNames.filter(name => name.includes('shift'));
      const leaveTools = toolNames.filter(name => name.includes('leave'));
      
      expect(authTools.length).toBeGreaterThanOrEqual(3); // Auth tools
      expect(userTools.length).toBeGreaterThanOrEqual(7); // User service tools  
      expect(approvalTools.length).toBeGreaterThanOrEqual(4); // Approval tools
      expect(fileTools.length).toBeGreaterThanOrEqual(4); // File upload tools
      expect(searchTools.length).toBeGreaterThanOrEqual(3); // Search tools
      expect(shiftTools.length).toBeGreaterThanOrEqual(7); // User shifts tools
      expect(leaveTools.length).toBeGreaterThanOrEqual(10); // Leaves + leave types tools
    });

    it('should have consistent naming patterns across services', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      const toolNames = Array.from(tools.keys());
      
      // Check that most tools start with passgage_ (ping tool doesn't)
      const passgageTools = toolNames.filter(name => name.startsWith('passgage_'));
      expect(passgageTools.length).toBeGreaterThanOrEqual(toolNames.length - 2);
      
      // Check for consistent CRUD patterns
      const listTools = toolNames.filter(name => name.includes('list_'));
      const getTools = toolNames.filter(name => name.startsWith('passgage_get_'));
      const createTools = toolNames.filter(name => name.includes('create_'));
      const updateTools = toolNames.filter(name => name.includes('update_'));
      const deleteTools = toolNames.filter(name => name.includes('delete_'));
      
      expect(listTools.length).toBeGreaterThanOrEqual(5);
      expect(getTools.length).toBeGreaterThanOrEqual(5);
      expect(createTools.length).toBeGreaterThanOrEqual(4);
      expect(updateTools.length).toBeGreaterThanOrEqual(4);
      expect(deleteTools.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Tool Permissions and Validation', () => {
    it('should have proper permission configurations', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check that administrative tools require company mode
      const createLeaveTypeTool = tools.get('passgage_create_leave_type');
      expect(createLeaveTypeTool!.getMetadata().permissions?.companyMode).toBe(true);
      expect(createLeaveTypeTool!.getMetadata().permissions?.userMode).toBe(false);
      
      // Check that user tools allow both modes
      const listLeavesTool = tools.get('passgage_list_leaves');
      expect(listLeavesTool!.getMetadata().permissions?.companyMode).toBe(true);
      expect(listLeavesTool!.getMetadata().permissions?.userMode).toBe(true);
    });

    it('should have proper category classifications', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      const userShiftTool = tools.get('passgage_list_user_shifts');
      expect(userShiftTool!.getMetadata().category).toBe('user-shifts');
      
      const leaveTool = tools.get('passgage_list_leaves');
      expect(leaveTool!.getMetadata().category).toBe('leaves');
      
      const leaveTypeTool = tools.get('passgage_list_leave_types');
      expect(leaveTypeTool!.getMetadata().category).toBe('leave-types');
      
      const searchTool = tools.get('passgage_advanced_search');
      expect(searchTool!.getMetadata().category).toBe('search');
    });
  });
});