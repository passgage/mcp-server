import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';
import { 
  RansackQueryBuilder, 
  validateRansackQuery, 
  parseNaturalQuery,
  describeQuery,
  RANSACK_OPERATORS
} from '../../utils/ransack.js';

const advancedSearchSchema = z.object({
  service: z.enum([
    'users', 'approvals', 'approval_flows', 'access_zones', 'assignment_requests',
    'branches', 'branch_groups', 'cards', 'departments', 'devices', 'entrances',
    'holidays', 'job_positions', 'leaves', 'leave_rules', 'leave_types', 'night_works',
    'organization_units', 'shifts', 'slacks', 'sub_companies', 'user_rates',
    'user_shifts', 'working_days', 'payrolls', 'user_extra_works', 'shift_settings'
  ]).describe('Passgage service to search in'),
  query: z.record(z.any()).optional().describe('Ransack query object with field_operator: value format'),
  natural_query: z.string().optional().describe('Natural language query that will be converted to Ransack format'),
  page: z.number().int().positive().optional().default(1).describe('Page number for pagination'),
  per_page: z.number().int().positive().max(50).optional().default(25).describe('Items per page (max 50)'),
  include_total: z.boolean().optional().default(true).describe('Include total count in response'),
  sort: z.string().optional().describe('Sort field (use field_direction format like "name_asc" or "created_at_desc")')
});

const queryBuilderSchema = z.object({
  operations: z.array(z.object({
    field: z.string().describe('Field name to filter on'),
    operator: z.enum([
      'eq', 'not_eq', 'gt', 'gteq', 'lt', 'lteq', 'cont', 'not_cont', 'i_cont', 'not_i_cont',
      'start', 'not_start', 'i_start', 'not_i_start', 'end', 'not_end', 'i_end', 'not_i_end',
      'in', 'not_in', 'null', 'not_null', 'present', 'blank', 'true', 'false', 'matches', 'does_not_match'
    ]).describe('Ransack operator to use'),
    value: z.any().describe('Value to compare against (can be string, number, boolean, or array for "in" operators)')
  })).describe('List of filtering operations to combine with AND logic')
});

const explainOperatorsSchema = z.object({});

export class AdvancedSearchTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_advanced_search',
      description: 'Perform advanced searches across Passgage services using Ransack filtering with 25+ operators',
      category: 'search',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return advancedSearchSchema;
  }

  async execute(args: z.infer<typeof advancedSearchSchema>): Promise<any> {
    const validated = advancedSearchSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      let finalQuery: any = {};

      // Process natural language query if provided
      if (validated.natural_query) {
        const naturalQuery = parseNaturalQuery(validated.natural_query);
        finalQuery = { ...naturalQuery };
      }

      // Merge with explicit query if provided
      if (validated.query) {
        const validation = validateRansackQuery(validated.query);
        if (!validation.valid) {
          return this.errorResponse('Invalid Ransack query', validation.errors.join('; '));
        }
        finalQuery = { ...finalQuery, ...validated.query };
      }

      // Build API request parameters
      const params: any = {
        page: validated.page,
        per_page: validated.per_page
      };

      if (Object.keys(finalQuery).length > 0) {
        params.q = finalQuery;
      }

      if (validated.sort) {
        params.s = validated.sort;
      }

      // Make API request
      const endpoint = `/api/public/v1/${validated.service}`;
      const response = await this.apiClient.get(endpoint, params);

      if (response.success) {
        const results = Array.isArray(response.data) ? response.data : [];
        
        return this.successResponse({
          service: validated.service,
          query_description: Object.keys(finalQuery).length > 0 ? describeQuery(finalQuery) : 'No filters applied',
          total_results: results.length,
          page: validated.page,
          per_page: validated.per_page,
          sort: validated.sort,
          results: results,
          ransack_query: finalQuery
        }, `Found ${results.length} results in ${validated.service}`);
      } else {
        return this.errorResponse('Search failed', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Advanced search failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          service: {
            type: 'string',
            enum: [
              'users', 'approvals', 'approval_flows', 'access_zones', 'assignment_requests',
              'branches', 'branch_groups', 'cards', 'departments', 'devices', 'entrances',
              'holidays', 'job_positions', 'leaves', 'leave_rules', 'leave_types', 'night_works',
              'organization_units', 'shifts', 'slacks', 'sub_companies', 'user_rates',
              'user_shifts', 'working_days', 'payrolls', 'user_extra_works', 'shift_settings'
            ],
            description: 'Passgage service to search in'
          },
          query: {
            type: 'object',
            description: 'Ransack query object with field_operator: value format',
            additionalProperties: true
          },
          natural_query: {
            type: 'string',
            description: 'Natural language query that will be converted to Ransack format'
          },
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Page number for pagination',
            default: 1
          },
          per_page: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Items per page (max 50)',
            default: 25
          },
          include_total: {
            type: 'boolean',
            description: 'Include total count in response',
            default: true
          },
          sort: {
            type: 'string',
            description: 'Sort field (use field_direction format like "name_asc" or "created_at_desc")'
          }
        },
        required: ['service']
      }
    };
  }
}

export class QueryBuilderTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_build_ransack_query',
      description: 'Build complex Ransack queries using a fluent interface with multiple filtering operations',
      category: 'search',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return queryBuilderSchema;
  }

  async execute(args: z.infer<typeof queryBuilderSchema>): Promise<any> {
    const validated = queryBuilderSchema.parse(args);
    
    try {
      const builder = new RansackQueryBuilder();

      for (const operation of validated.operations) {
        const { field, operator, value } = operation;

        // Apply the operation using the builder
        switch (operator) {
          case 'eq':
            builder.eq(field, value);
            break;
          case 'not_eq':
            builder.notEq(field, value);
            break;
          case 'gt':
            builder.gt(field, value);
            break;
          case 'gteq':
            builder.gte(field, value);
            break;
          case 'lt':
            builder.lt(field, value);
            break;
          case 'lteq':
            builder.lte(field, value);
            break;
          case 'cont':
            builder.contains(field, String(value));
            break;
          case 'i_cont':
            builder.iContains(field, String(value));
            break;
          case 'start':
            builder.startsWith(field, String(value));
            break;
          case 'end':
            builder.endsWith(field, String(value));
            break;
          case 'in':
            builder.in(field, Array.isArray(value) ? value : [value]);
            break;
          case 'not_in':
            builder.notIn(field, Array.isArray(value) ? value : [value]);
            break;
          case 'null':
            builder.isNull(field);
            break;
          case 'not_null':
            builder.isNotNull(field);
            break;
          case 'present':
            builder.isPresent(field);
            break;
          case 'blank':
            builder.isBlank(field);
            break;
          case 'true':
            builder.isTrue(field);
            break;
          case 'false':
            builder.isFalse(field);
            break;
          case 'matches':
            builder.matches(field, String(value));
            break;
          case 'does_not_match':
            builder.doesNotMatch(field, String(value));
            break;
          default:
            builder.custom(field, operator, value);
        }
      }

      const builtQuery = builder.build();
      const validation = validateRansackQuery(builtQuery);

      if (!validation.valid) {
        return this.errorResponse('Invalid query built', validation.errors.join('; '));
      }

      return this.successResponse({
        query: builtQuery,
        description: describeQuery(builtQuery),
        operations_applied: validated.operations.length,
        url_params: builder.toParams(),
        validation: validation
      }, `Built Ransack query with ${validated.operations.length} operations`);
    } catch (error: any) {
      return this.errorResponse('Query building failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          operations: {
            type: 'array',
            description: 'List of filtering operations to combine with AND logic',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field name to filter on'
                },
                operator: {
                  type: 'string',
                  enum: [
                    'eq', 'not_eq', 'gt', 'gteq', 'lt', 'lteq', 'cont', 'not_cont', 'i_cont', 'not_i_cont',
                    'start', 'not_start', 'i_start', 'not_i_start', 'end', 'not_end', 'i_end', 'not_i_end',
                    'in', 'not_in', 'null', 'not_null', 'present', 'blank', 'true', 'false', 'matches', 'does_not_match'
                  ],
                  description: 'Ransack operator to use'
                },
                value: {
                  description: 'Value to compare against (can be string, number, boolean, or array for "in" operators)'
                }
              },
              required: ['field', 'operator', 'value']
            }
          }
        },
        required: ['operations']
      }
    };
  }
}

export class ExplainOperatorsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_explain_ransack_operators',
      description: 'Get detailed information about all available Ransack query operators and their usage',
      category: 'search',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return explainOperatorsSchema;
  }

  async execute(_args: z.infer<typeof explainOperatorsSchema>): Promise<any> {
    const operatorCategories = {
      equality: ['eq', 'not_eq'],
      comparison: ['gt', 'gteq', 'lt', 'lteq'],
      string_matching: ['cont', 'not_cont', 'i_cont', 'not_i_cont', 'start', 'not_start', 'i_start', 'not_i_start', 'end', 'not_end', 'i_end', 'not_i_end'],
      array_list: ['in', 'not_in'],
      boolean_null: ['null', 'not_null', 'present', 'blank', 'true', 'false'],
      pattern_matching: ['matches', 'does_not_match']
    };

    const categorizedOperators: any = {};
    let totalOperators = 0;

    Object.entries(operatorCategories).forEach(([category, operators]) => {
      categorizedOperators[category] = operators.map(op => {
        const operatorInfo = RANSACK_OPERATORS[op];
        totalOperators++;
        return {
          operator: op,
          suffix: operatorInfo.suffix,
          description: operatorInfo.description,
          example: operatorInfo.example
        };
      });
    });

    const commonExamples = [
      {
        description: "Find active users with email containing 'john'",
        query: { is_active_eq: true, email_i_cont: "john" },
        natural: "is_active equals true and email contains john"
      },
      {
        description: "Find approvals created in the last 30 days that are pending",
        query: { status_eq: "pending", created_at_gteq: "2024-01-01" },
        natural: "status equals pending and created_at greater than or equal to 2024-01-01"
      },
      {
        description: "Find users in specific departments",
        query: { department_name_in: ["Engineering", "Sales", "Marketing"] },
        natural: "department_name in Engineering, Sales, Marketing"
      },
      {
        description: "Find records where field is not empty",
        query: { notes_present: true },
        natural: "notes is present"
      }
    ];

    return this.successResponse({
      total_operators: totalOperators,
      categories: Object.keys(operatorCategories),
      operators: categorizedOperators,
      common_examples: commonExamples,
      usage_tips: [
        "Use 'i_cont' for case-insensitive contains searches",
        "Boolean operators (null, present, blank, true, false) require boolean values",
        "Array operators (in, not_in) require array values",
        "Combine multiple conditions for complex queries - they use AND logic",
        "Use natural language queries for simple searches, structured queries for complex ones"
      ],
      supported_services: [
        'users', 'approvals', 'approval_flows', 'access_zones', 'assignment_requests',
        'branches', 'branch_groups', 'cards', 'departments', 'devices', 'entrances',
        'holidays', 'job_positions', 'leaves', 'leave_rules', 'leave_types', 'night_works',
        'organization_units', 'shifts', 'slacks', 'sub_companies', 'user_rates',
        'user_shifts', 'working_days', 'payrolls', 'user_extra_works', 'shift_settings'
      ]
    }, `Available Ransack operators: ${totalOperators} operators across ${Object.keys(operatorCategories).length} categories`);
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {}
      }
    };
  }
}