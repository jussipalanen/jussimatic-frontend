export const PERMISSION_MESSAGE = 'The user does not have enough permissions to view this';

type UnknownRecord = Record<string, unknown>;

function pushRole(target: string[], value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    target.push(value.trim().toLowerCase());
  }
}

function extractRolesFromObject(target: string[], obj: UnknownRecord | null | undefined) {
  if (!obj) return;

  if (Array.isArray(obj.roles)) {
    obj.roles.forEach((role) => pushRole(target, role));
  }

  pushRole(target, obj.role);
  pushRole(target, obj.user_role);
  pushRole(target, obj.type);
}

function hasAdminFlag(obj: UnknownRecord | null | undefined): boolean {
  if (!obj) return false;

  const candidates = [obj.is_admin, obj.isAdmin, obj.admin];
  return candidates.some((value) => value === true);
}

export function getRoleAccess(me: unknown) {
  const roles: string[] = [];

  if (me && typeof me === 'object') {
    const record = me as UnknownRecord;
    extractRolesFromObject(roles, record);

    if (record.user && typeof record.user === 'object') {
      extractRolesFromObject(roles, record.user as UnknownRecord);
    }

    if (Array.isArray(record.roles)) {
      record.roles.forEach((role) => pushRole(roles, role));
    }
  }

  const uniqueRoles = Array.from(new Set(roles));
  const nestedUser =
    me && typeof me === 'object' && 'user' in (me as UnknownRecord) && typeof (me as UnknownRecord).user === 'object'
      ? ((me as UnknownRecord).user as UnknownRecord)
      : null;
  const adminByFlag = hasAdminFlag(me as UnknownRecord) || hasAdminFlag(nestedUser);
  const isAdmin = uniqueRoles.includes('admin') || uniqueRoles.includes('administrator') || adminByFlag;
  const isVendor = uniqueRoles.includes('vendor');
  const isCustomer = !isAdmin && !isVendor;

  return {
    roles: uniqueRoles,
    isAdmin,
    isVendor,
    isCustomer,
  };
}
