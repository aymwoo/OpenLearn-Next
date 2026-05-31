import { describe, it, expect } from 'vitest';
import { UserDTOSchema } from '../dto/user';
import { MembershipDTOSchema } from '../dto/membership';

describe('DAL Boundaries and DTOs', () => {
  it('UserDTO should strip password and other sensitive fields', () => {
    const rawDbRecord = {
      id: '123',
      name: 'Alice',
      email: 'alice@example.com',
      password: 'hashed_password_xyz',
      emailVerified: 123456789,
    };

    const parsed = UserDTOSchema.parse(rawDbRecord);

    expect(parsed).toHaveProperty('id', '123');
    expect(parsed).toHaveProperty('name', 'Alice');
    expect(parsed).toHaveProperty('email', 'alice@example.com');
    
    // Should NOT have password or emailVerified
    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('emailVerified');
  });

  it('MembershipDTO should parse valid roles correctly', () => {
    const validMembership = {
      id: 'm1',
      userId: 'u1',
      schoolId: 's1',
      role: 'teacher',
      status: 'active',
    };

    const parsed = MembershipDTOSchema.parse(validMembership);
    expect(parsed.role).toBe('teacher');
  });

  it('MembershipDTO should reject invalid roles', () => {
    const invalidMembership = {
      id: 'm2',
      userId: 'u2',
      schoolId: 's2',
      role: 'superadmin_hacker',
      status: 'active',
    };

    const result = MembershipDTOSchema.safeParse(invalidMembership);
    expect(result.success).toBe(false);
  });
});
