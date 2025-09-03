/**
 * Advanced Ransack filtering engine for Passgage API
 * Supports 25+ operators and complex query building
 */

export interface RansackQuery {
  [key: string]: any;
}

export interface RansackOperator {
  suffix: string;
  description: string;
  example: string;
}

// Complete list of Ransack operators from Passgage API
export const RANSACK_OPERATORS: Record<string, RansackOperator> = {
  // Equality operators
  eq: { suffix: '_eq', description: 'Equal to', example: 'name_eq: "John"' },
  not_eq: { suffix: '_not_eq', description: 'Not equal to', example: 'status_not_eq: "inactive"' },
  
  // Comparison operators
  gt: { suffix: '_gt', description: 'Greater than', example: 'age_gt: 18' },
  gteq: { suffix: '_gteq', description: 'Greater than or equal to', example: 'salary_gteq: 50000' },
  lt: { suffix: '_lt', description: 'Less than', example: 'age_lt: 65' },
  lteq: { suffix: '_lteq', description: 'Less than or equal to', example: 'salary_lteq: 100000' },
  
  // String matching operators
  cont: { suffix: '_cont', description: 'Contains (case sensitive)', example: 'name_cont: "John"' },
  not_cont: { suffix: '_not_cont', description: 'Does not contain', example: 'name_not_cont: "test"' },
  i_cont: { suffix: '_i_cont', description: 'Contains (case insensitive)', example: 'email_i_cont: "gmail"' },
  not_i_cont: { suffix: '_not_i_cont', description: 'Does not contain (case insensitive)', example: 'email_not_i_cont: "spam"' },
  
  start: { suffix: '_start', description: 'Starts with (case sensitive)', example: 'name_start: "Mr"' },
  not_start: { suffix: '_not_start', description: 'Does not start with', example: 'name_not_start: "Dr"' },
  i_start: { suffix: '_i_start', description: 'Starts with (case insensitive)', example: 'name_i_start: "john"' },
  not_i_start: { suffix: '_not_i_start', description: 'Does not start with (case insensitive)', example: 'name_not_i_start: "test"' },
  
  end: { suffix: '_end', description: 'Ends with (case sensitive)', example: 'name_end: "son"' },
  not_end: { suffix: '_not_end', description: 'Does not end with', example: 'name_not_end: "test"' },
  i_end: { suffix: '_i_end', description: 'Ends with (case insensitive)', example: 'email_i_end: "com"' },
  not_i_end: { suffix: '_not_i_end', description: 'Does not end with (case insensitive)', example: 'email_not_i_end: "test"' },
  
  // Array/List operators
  in: { suffix: '_in', description: 'In list', example: 'status_in: ["active", "pending"]' },
  not_in: { suffix: '_not_in', description: 'Not in list', example: 'status_not_in: ["deleted", "archived"]' },
  
  // Boolean/Null operators
  null: { suffix: '_null', description: 'Is null', example: 'deleted_at_null: true' },
  not_null: { suffix: '_not_null', description: 'Is not null', example: 'created_at_not_null: true' },
  
  present: { suffix: '_present', description: 'Is present (not null/empty)', example: 'name_present: true' },
  blank: { suffix: '_blank', description: 'Is blank (null or empty)', example: 'middle_name_blank: true' },
  
  // Date/Time operators
  matches: { suffix: '_matches', description: 'Matches regex pattern', example: 'phone_matches: "^\\+1"' },
  does_not_match: { suffix: '_does_not_match', description: 'Does not match regex', example: 'email_does_not_match: "test"' },
  
  // Advanced operators
  true: { suffix: '_true', description: 'Is true', example: 'is_active_true: true' },
  false: { suffix: '_false', description: 'Is false', example: 'is_deleted_false: true' }
};

export class RansackQueryBuilder {
  private query: RansackQuery = {};
  
  constructor(initialQuery?: RansackQuery) {
    if (initialQuery) {
      this.query = { ...initialQuery };
    }
  }

  /**
   * Add an equality condition
   */
  eq(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_eq`] = value;
    return this;
  }

  /**
   * Add a not equal condition
   */
  notEq(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_not_eq`] = value;
    return this;
  }

  /**
   * Add a contains condition (case sensitive)
   */
  contains(field: string, value: string): RansackQueryBuilder {
    this.query[`${field}_cont`] = value;
    return this;
  }

  /**
   * Add a contains condition (case insensitive)
   */
  iContains(field: string, value: string): RansackQueryBuilder {
    this.query[`${field}_i_cont`] = value;
    return this;
  }

  /**
   * Add a starts with condition
   */
  startsWith(field: string, value: string): RansackQueryBuilder {
    this.query[`${field}_start`] = value;
    return this;
  }

  /**
   * Add an ends with condition
   */
  endsWith(field: string, value: string): RansackQueryBuilder {
    this.query[`${field}_end`] = value;
    return this;
  }

  /**
   * Add an "in list" condition
   */
  in(field: string, values: any[]): RansackQueryBuilder {
    this.query[`${field}_in`] = values;
    return this;
  }

  /**
   * Add a "not in list" condition
   */
  notIn(field: string, values: any[]): RansackQueryBuilder {
    this.query[`${field}_not_in`] = values;
    return this;
  }

  /**
   * Add a greater than condition
   */
  gt(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_gt`] = value;
    return this;
  }

  /**
   * Add a greater than or equal condition
   */
  gte(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_gteq`] = value;
    return this;
  }

  /**
   * Add a less than condition
   */
  lt(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_lt`] = value;
    return this;
  }

  /**
   * Add a less than or equal condition
   */
  lte(field: string, value: any): RansackQueryBuilder {
    this.query[`${field}_lteq`] = value;
    return this;
  }

  /**
   * Add an "is null" condition
   */
  isNull(field: string): RansackQueryBuilder {
    this.query[`${field}_null`] = true;
    return this;
  }

  /**
   * Add an "is not null" condition
   */
  isNotNull(field: string): RansackQueryBuilder {
    this.query[`${field}_not_null`] = true;
    return this;
  }

  /**
   * Add an "is present" condition (not null and not empty)
   */
  isPresent(field: string): RansackQueryBuilder {
    this.query[`${field}_present`] = true;
    return this;
  }

  /**
   * Add an "is blank" condition (null or empty)
   */
  isBlank(field: string): RansackQueryBuilder {
    this.query[`${field}_blank`] = true;
    return this;
  }

  /**
   * Add an "is true" condition
   */
  isTrue(field: string): RansackQueryBuilder {
    this.query[`${field}_true`] = true;
    return this;
  }

  /**
   * Add an "is false" condition
   */
  isFalse(field: string): RansackQueryBuilder {
    this.query[`${field}_false`] = true;
    return this;
  }

  /**
   * Add a regex match condition
   */
  matches(field: string, pattern: string): RansackQueryBuilder {
    this.query[`${field}_matches`] = pattern;
    return this;
  }

  /**
   * Add a regex not match condition
   */
  doesNotMatch(field: string, pattern: string): RansackQueryBuilder {
    this.query[`${field}_does_not_match`] = pattern;
    return this;
  }

  /**
   * Add a custom condition with operator
   */
  custom(field: string, operator: string, value: any): RansackQueryBuilder {
    const operatorInfo = Object.values(RANSACK_OPERATORS).find(op => op.suffix === `_${operator}`);
    if (!operatorInfo) {
      throw new Error(`Unknown Ransack operator: ${operator}`);
    }
    this.query[`${field}_${operator}`] = value;
    return this;
  }

  /**
   * Merge another query
   */
  merge(otherQuery: RansackQuery): RansackQueryBuilder {
    this.query = { ...this.query, ...otherQuery };
    return this;
  }

  /**
   * Clear all conditions
   */
  clear(): RansackQueryBuilder {
    this.query = {};
    return this;
  }

  /**
   * Get the built query
   */
  build(): RansackQuery {
    return { ...this.query };
  }

  /**
   * Get the query as URL parameters
   */
  toParams(): Record<string, string> {
    const params: Record<string, string> = {};
    
    Object.entries(this.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array values for "in" operators
        params[`q[${key}]`] = value.join(',');
      } else {
        params[`q[${key}]`] = String(value);
      }
    });

    return params;
  }
}

/**
 * Validate a Ransack query object
 */
export function validateRansackQuery(query: RansackQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    // Extract field and operator from key (e.g., "name_cont" -> "name", "cont")
    const lastUnderscoreIndex = key.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) {
      errors.push(`Invalid query key format: ${key}. Expected format: field_operator`);
      continue;
    }

    const operator = key.substring(lastUnderscoreIndex + 1);
    const field = key.substring(0, lastUnderscoreIndex);

    if (!field) {
      errors.push(`Empty field name in query key: ${key}`);
      continue;
    }

    // Check if operator is valid
    const operatorExists = Object.keys(RANSACK_OPERATORS).some(op => 
      RANSACK_OPERATORS[op].suffix === `_${operator}`
    );

    if (!operatorExists) {
      errors.push(`Unknown Ransack operator: ${operator}. Available operators: ${Object.keys(RANSACK_OPERATORS).join(', ')}`);
      continue;
    }

    // Validate value based on operator type
    if ((operator === 'in' || operator === 'not_in') && !Array.isArray(value)) {
      errors.push(`Operator "${operator}" requires an array value, got: ${typeof value}`);
    }

    if ((operator === 'null' || operator === 'not_null' || operator === 'present' || 
         operator === 'blank' || operator === 'true' || operator === 'false') && 
        typeof value !== 'boolean') {
      errors.push(`Operator "${operator}" requires a boolean value, got: ${typeof value}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new Ransack query builder
 */
export function ransack(initialQuery?: RansackQuery): RansackQueryBuilder {
  return new RansackQueryBuilder(initialQuery);
}

/**
 * Parse a natural language query into Ransack format
 * Example: "name contains John and status equals active" -> { name_cont: "John", status_eq: "active" }
 */
export function parseNaturalQuery(naturalQuery: string): RansackQuery {
  const query: RansackQuery = {};
  
  // Split by 'and' to handle multiple conditions
  const conditions = naturalQuery.split(/\s+and\s+/i);
  
  // Pattern matching for common query patterns
  const patterns = [
    { regex: /^(\w+)\s+contains\s+"?([^"]+)"?$/i, operator: 'cont' },
    { regex: /^(\w+)\s+equals?\s+"?([^"]+)"?$/i, operator: 'eq' },
    { regex: /^(\w+)\s+starts?\s+with\s+"?([^"]+)"?$/i, operator: 'start' },
    { regex: /^(\w+)\s+ends?\s+with\s+"?([^"]+)"?$/i, operator: 'end' },
    { regex: /^(\w+)\s+is\s+null$/i, operator: 'null', value: true },
    { regex: /^(\w+)\s+is\s+not\s+null$/i, operator: 'not_null', value: true },
    { regex: /^(\w+)\s+is\s+true$/i, operator: 'true', value: true },
    { regex: /^(\w+)\s+is\s+false$/i, operator: 'false', value: true },
    { regex: /^(\w+)\s+>\s*(\d+)$/i, operator: 'gt' },
    { regex: /^(\w+)\s+>=\s*(\d+)$/i, operator: 'gteq' },
    { regex: /^(\w+)\s+<\s*(\d+)$/i, operator: 'lt' },
    { regex: /^(\w+)\s+<=\s*(\d+)$/i, operator: 'lteq' }
  ];

  // Process each condition separately
  for (const condition of conditions) {
    const trimmedCondition = condition.trim();
    
    for (const pattern of patterns) {
      const match = pattern.regex.exec(trimmedCondition);
      if (match) {
        const field = match[1];
        const value = pattern.value !== undefined ? pattern.value : 
                     (match[2] && !isNaN(Number(match[2])) ? Number(match[2]) : match[2]);
        query[`${field}_${pattern.operator}`] = value;
        break; // Found a match for this condition, move to next
      }
    }
  }

  return query;
}

/**
 * Convert a Ransack query to human-readable description
 */
export function describeQuery(query: RansackQuery): string {
  const descriptions: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    const lastUnderscoreIndex = key.lastIndexOf('_');
    const operator = key.substring(lastUnderscoreIndex + 1);
    const field = key.substring(0, lastUnderscoreIndex);
    
    const operatorInfo = Object.values(RANSACK_OPERATORS).find(op => 
      op.suffix === `_${operator}`
    );

    if (operatorInfo) {
      let valueStr = Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
      descriptions.push(`${field} ${operatorInfo.description.toLowerCase()} ${valueStr}`);
    } else {
      descriptions.push(`${key}: ${value}`);
    }
  }

  return descriptions.join(' AND ');
}