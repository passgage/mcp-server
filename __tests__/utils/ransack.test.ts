import {
  RansackQueryBuilder,
  validateRansackQuery,
  parseNaturalQuery,
  describeQuery,
  ransack,
  RANSACK_OPERATORS
} from '../../src/utils/ransack.js';

describe('Ransack Query Engine', () => {
  describe('RANSACK_OPERATORS', () => {
    it('should have all 25+ operators defined', () => {
      expect(Object.keys(RANSACK_OPERATORS)).toHaveLength(28);
      
      // Check critical operators exist
      expect(RANSACK_OPERATORS).toHaveProperty('eq');
      expect(RANSACK_OPERATORS).toHaveProperty('not_eq');
      expect(RANSACK_OPERATORS).toHaveProperty('cont');
      expect(RANSACK_OPERATORS).toHaveProperty('i_cont');
      expect(RANSACK_OPERATORS).toHaveProperty('gt');
      expect(RANSACK_OPERATORS).toHaveProperty('lt');
      expect(RANSACK_OPERATORS).toHaveProperty('in');
      expect(RANSACK_OPERATORS).toHaveProperty('null');
      expect(RANSACK_OPERATORS).toHaveProperty('present');
    });

    it('should have proper operator structure', () => {
      Object.entries(RANSACK_OPERATORS).forEach(([key, operator]) => {
        expect(operator).toHaveProperty('suffix');
        expect(operator).toHaveProperty('description');
        expect(operator).toHaveProperty('example');
        expect(operator.suffix).toBe(`_${key}`);
        expect(typeof operator.description).toBe('string');
        expect(typeof operator.example).toBe('string');
      });
    });
  });

  describe('RansackQueryBuilder', () => {
    let builder: RansackQueryBuilder;

    beforeEach(() => {
      builder = new RansackQueryBuilder();
    });

    describe('Equality Operators', () => {
      it('should build eq queries', () => {
        const query = builder.eq('name', 'John').build();
        expect(query).toEqual({ name_eq: 'John' });
      });

      it('should build not_eq queries', () => {
        const query = builder.notEq('status', 'inactive').build();
        expect(query).toEqual({ status_not_eq: 'inactive' });
      });

      it('should chain multiple equality conditions', () => {
        const query = builder
          .eq('name', 'John')
          .notEq('status', 'deleted')
          .build();
        
        expect(query).toEqual({
          name_eq: 'John',
          status_not_eq: 'deleted'
        });
      });
    });

    describe('Comparison Operators', () => {
      it('should build gt queries', () => {
        const query = builder.gt('age', 18).build();
        expect(query).toEqual({ age_gt: 18 });
      });

      it('should build gte queries', () => {
        const query = builder.gte('salary', 50000).build();
        expect(query).toEqual({ salary_gteq: 50000 });
      });

      it('should build lt queries', () => {
        const query = builder.lt('age', 65).build();
        expect(query).toEqual({ age_lt: 65 });
      });

      it('should build lte queries', () => {
        const query = builder.lte('score', 100).build();
        expect(query).toEqual({ score_lteq: 100 });
      });

      it('should handle date comparisons', () => {
        const date = '2024-01-01';
        const query = builder
          .gte('created_at', date)
          .lt('updated_at', '2024-12-31')
          .build();
        
        expect(query).toEqual({
          created_at_gteq: date,
          updated_at_lt: '2024-12-31'
        });
      });
    });

    describe('String Matching Operators', () => {
      it('should build contains queries (case sensitive)', () => {
        const query = builder.contains('description', 'important').build();
        expect(query).toEqual({ description_cont: 'important' });
      });

      it('should build contains queries (case insensitive)', () => {
        const query = builder.iContains('email', 'GMAIL').build();
        expect(query).toEqual({ email_i_cont: 'GMAIL' });
      });

      it('should build starts with queries', () => {
        const query = builder.startsWith('name', 'Mr').build();
        expect(query).toEqual({ name_start: 'Mr' });
      });

      it('should build ends with queries', () => {
        const query = builder.endsWith('email', '.com').build();
        expect(query).toEqual({ email_end: '.com' });
      });

      it('should handle complex string matching', () => {
        const query = builder
          .iContains('title', 'manager')
          .startsWith('code', 'EMP')
          .endsWith('email', '@company.com')
          .build();
        
        expect(query).toEqual({
          title_i_cont: 'manager',
          code_start: 'EMP',
          email_end: '@company.com'
        });
      });
    });

    describe('Array/List Operators', () => {
      it('should build in queries', () => {
        const query = builder.in('status', ['active', 'pending', 'approved']).build();
        expect(query).toEqual({ status_in: ['active', 'pending', 'approved'] });
      });

      it('should build not in queries', () => {
        const query = builder.notIn('category', ['deleted', 'archived']).build();
        expect(query).toEqual({ category_not_in: ['deleted', 'archived'] });
      });

      it('should handle single item arrays', () => {
        const query = builder.in('type', ['premium']).build();
        expect(query).toEqual({ type_in: ['premium'] });
      });

      it('should handle mixed data types in arrays', () => {
        const query = builder.in('id', [1, 2, 3]).build();
        expect(query).toEqual({ id_in: [1, 2, 3] });
      });
    });

    describe('Boolean/Null Operators', () => {
      it('should build null queries', () => {
        const query = builder.isNull('deleted_at').build();
        expect(query).toEqual({ deleted_at_null: true });
      });

      it('should build not null queries', () => {
        const query = builder.isNotNull('created_at').build();
        expect(query).toEqual({ created_at_not_null: true });
      });

      it('should build present queries', () => {
        const query = builder.isPresent('description').build();
        expect(query).toEqual({ description_present: true });
      });

      it('should build blank queries', () => {
        const query = builder.isBlank('middle_name').build();
        expect(query).toEqual({ middle_name_blank: true });
      });

      it('should build true/false queries', () => {
        const query = builder
          .isTrue('is_active')
          .isFalse('is_deleted')
          .build();
        
        expect(query).toEqual({
          is_active_true: true,
          is_deleted_false: true
        });
      });
    });

    describe('Pattern Matching Operators', () => {
      it('should build regex match queries', () => {
        const query = builder.matches('phone', '^\\+1').build();
        expect(query).toEqual({ phone_matches: '^\\+1' });
      });

      it('should build regex not match queries', () => {
        const query = builder.doesNotMatch('email', 'test').build();
        expect(query).toEqual({ email_does_not_match: 'test' });
      });
    });

    describe('Custom Operators', () => {
      it('should build custom operator queries', () => {
        const query = builder.custom('field', 'cont', 'value').build();
        expect(query).toEqual({ field_cont: 'value' });
      });

      it('should throw error for unknown operators', () => {
        expect(() => {
          builder.custom('field', 'unknown_op', 'value');
        }).toThrow('Unknown Ransack operator: unknown_op');
      });
    });

    describe('Query Management', () => {
      it('should merge queries', () => {
        const baseQuery = { name_eq: 'John' };
        const additionalQuery = { age_gt: 18 };
        
        const query = builder
          .eq('status', 'active')
          .merge(baseQuery)
          .merge(additionalQuery)
          .build();
        
        expect(query).toEqual({
          status_eq: 'active',
          name_eq: 'John',
          age_gt: 18
        });
      });

      it('should clear all conditions', () => {
        builder.eq('name', 'John').gt('age', 18);
        expect(Object.keys(builder.build())).toHaveLength(2);
        
        builder.clear();
        expect(builder.build()).toEqual({});
      });

      it('should convert to URL parameters', () => {
        const params = builder
          .eq('name', 'John')
          .in('status', ['active', 'pending'])
          .toParams();
        
        expect(params).toEqual({
          'q[name_eq]': 'John',
          'q[status_in]': 'active,pending'
        });
      });
    });

    describe('Constructor with Initial Query', () => {
      it('should accept initial query in constructor', () => {
        const initialQuery = { name_eq: 'John', age_gt: 18 };
        const builder = new RansackQueryBuilder(initialQuery);
        
        const query = builder.eq('status', 'active').build();
        expect(query).toEqual({
          name_eq: 'John',
          age_gt: 18,
          status_eq: 'active'
        });
      });
    });
  });

  describe('validateRansackQuery', () => {
    it('should validate correct queries', () => {
      const validQuery = {
        name_eq: 'John',
        age_gt: 18,
        status_in: ['active', 'pending'],
        created_at_null: true
      };
      
      const result = validateRansackQuery(validQuery);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid operator format', () => {
      const invalidQuery = {
        'invalid_format': 'value',
        'name': 'John'  // Missing operator
      };
      
      const result = validateRansackQuery(invalidQuery);
      expect(result.valid).toBe(false);
      // 'invalid_format' is parsed as field 'invalid' with operator 'format', which is unknown
      expect(result.errors.some(error => error.includes('Unknown Ransack operator: format'))).toBe(true);
      expect(result.errors).toContain('Invalid query key format: name. Expected format: field_operator');
    });

    it('should detect unknown operators', () => {
      const invalidQuery = {
        name_unknown: 'John',
        age_invalid_op: 18
      };
      
      const result = validateRansackQuery(invalidQuery);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unknown Ransack operator: unknown'))).toBe(true);
      // 'age_invalid_op' is parsed as field 'age_invalid' with operator 'op'
      expect(result.errors.some(error => error.includes('Unknown Ransack operator: op'))).toBe(true);
    });

    it('should validate array operators require arrays', () => {
      const invalidQuery = {
        status_in: 'not_an_array',
        category_not_in: 'also_not_array'
      };
      
      const result = validateRansackQuery(invalidQuery);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('requires an array value'))).toBe(true);
    });

    it('should validate boolean operators require booleans', () => {
      const invalidQuery = {
        created_at_null: 'not_boolean',
        is_active_true: 'not_boolean'
      };
      
      const result = validateRansackQuery(invalidQuery);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('requires a boolean value'))).toBe(true);
    });

    it('should detect empty field names', () => {
      const invalidQuery = {
        '_eq': 'value'
      };
      
      const result = validateRansackQuery(invalidQuery);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty field name in query key: _eq');
    });
  });

  describe('parseNaturalQuery', () => {
    it('should parse contains queries', () => {
      const result = parseNaturalQuery('name contains "John Doe"');
      expect(result).toEqual({ name_cont: 'John Doe' });
    });

    it('should parse equals queries', () => {
      const result = parseNaturalQuery('status equals active');
      expect(result).toEqual({ status_eq: 'active' });
    });

    it('should parse starts with queries', () => {
      const result = parseNaturalQuery('code starts with "EMP"');
      expect(result).toEqual({ code_start: 'EMP' });
    });

    it('should parse ends with queries', () => {
      const result = parseNaturalQuery('email ends with ".com"');
      expect(result).toEqual({ email_end: '.com' });
    });

    it('should parse null queries', () => {
      const result = parseNaturalQuery('deleted_at is null');
      expect(result).toEqual({ deleted_at_null: true });
    });

    it('should parse not null queries', () => {
      const result = parseNaturalQuery('created_at is not null');
      expect(result).toEqual({ created_at_not_null: true });
    });

    it('should parse boolean queries', () => {
      const trueResult = parseNaturalQuery('is_active is true');
      const falseResult = parseNaturalQuery('is_deleted is false');
      
      expect(trueResult).toEqual({ is_active_true: true });
      expect(falseResult).toEqual({ is_deleted_false: true });
    });

    it('should parse numeric comparisons', () => {
      const gtResult = parseNaturalQuery('age > 18');
      const gteResult = parseNaturalQuery('salary >= 50000');
      const ltResult = parseNaturalQuery('score < 100');
      const lteResult = parseNaturalQuery('rating <= 5');
      
      expect(gtResult).toEqual({ age_gt: 18 });
      expect(gteResult).toEqual({ salary_gteq: 50000 });
      expect(ltResult).toEqual({ score_lt: 100 });
      expect(lteResult).toEqual({ rating_lteq: 5 });
    });

    it('should parse multiple conditions', () => {
      const result = parseNaturalQuery('name contains John and age > 18 and status equals active');
      expect(result).toEqual({
        name_cont: 'John',
        age_gt: 18,
        status_eq: 'active'
      });
    });

    it('should handle empty or invalid input', () => {
      expect(parseNaturalQuery('')).toEqual({});
      expect(parseNaturalQuery('invalid query format')).toEqual({});
    });
  });

  describe('describeQuery', () => {
    it('should describe simple queries', () => {
      const query = { name_eq: 'John', age_gt: 18 };
      const description = describeQuery(query);
      
      expect(description).toContain('name equal to John');
      expect(description).toContain('age greater than 18');
      expect(description).toContain(' AND ');
    });

    it('should describe array queries', () => {
      const query = { status_in: ['active', 'pending'] };
      const description = describeQuery(query);
      
      expect(description).toContain('status in list [active, pending]');
    });

    it('should describe boolean queries', () => {
      const query = { 
        created_at_null: true,
        is_active_true: true 
      };
      const description = describeQuery(query);
      
      expect(description).toContain('created_at is null true');
      expect(description).toContain('is_active is true true');
    });

    it('should handle unknown operators gracefully', () => {
      const query = { unknown_field_unknown_op: 'value' };
      const description = describeQuery(query);
      
      expect(description).toContain('unknown_field_unknown_op: value');
    });

    it('should handle empty queries', () => {
      const description = describeQuery({});
      expect(description).toBe('');
    });
  });

  describe('ransack helper function', () => {
    it('should create a new query builder', () => {
      const builder = ransack();
      expect(builder).toBeInstanceOf(RansackQueryBuilder);
    });

    it('should create builder with initial query', () => {
      const initialQuery = { name_eq: 'John' };
      const builder = ransack(initialQuery);
      const result = builder.gt('age', 18).build();
      
      expect(result).toEqual({
        name_eq: 'John',
        age_gt: 18
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large query building efficiently', () => {
      const startTime = Date.now();
      const builder = ransack();
      
      // Build a large query with 100 conditions
      for (let i = 0; i < 100; i++) {
        builder.eq(`field_${i}`, `value_${i}`);
      }
      
      const query = builder.build();
      const endTime = Date.now();
      
      expect(Object.keys(query)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle complex query validation efficiently', () => {
      const largeQuery: any = {};
      for (let i = 0; i < 50; i++) {
        largeQuery[`field_${i}_eq`] = `value_${i}`;
        largeQuery[`field_${i}_gt`] = i;
        largeQuery[`field_${i}_in`] = [`value_${i}_1`, `value_${i}_2`];
      }
      
      const startTime = Date.now();
      const result = validateRansackQuery(largeQuery);
      const endTime = Date.now();
      
      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in <50ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in values', () => {
      const query = ransack()
        .eq('name', 'John "Johnny" O\'Connor')
        .contains('description', 'Special chars: !@#$%^&*()')
        .build();
      
      expect(query).toEqual({
        name_eq: 'John "Johnny" O\'Connor',
        description_cont: 'Special chars: !@#$%^&*()'
      });
    });

    it('should handle unicode characters', () => {
      const query = ransack()
        .eq('name', 'José María')
        .contains('description', '中文测试 🎉')
        .build();
      
      expect(query).toEqual({
        name_eq: 'José María',
        description_cont: '中文测试 🎉'
      });
    });

    it('should handle null and undefined values appropriately', () => {
      const query = ransack()
        .eq('field1', null)
        .eq('field2', undefined)
        .build();
      
      expect(query).toEqual({
        field1_eq: null,
        field2_eq: undefined
      });
    });

    it('should handle empty arrays', () => {
      const query = ransack().in('status', []).build();
      expect(query).toEqual({ status_in: [] });
    });
  });
});