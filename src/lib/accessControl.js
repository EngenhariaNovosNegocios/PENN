export const ACCESS_ROLES = Object.freeze({
  collaborator: "colaborador",
  engineering: "engenharia",
  manager: "gerente",
  admin: "admin",
});

export const ACCESS_ROLE_LABELS = Object.freeze({
  [ACCESS_ROLES.collaborator]: "Colaborador",
  [ACCESS_ROLES.engineering]: "Engenharia",
  [ACCESS_ROLES.manager]: "Gerente",
  [ACCESS_ROLES.admin]: "Administrador",
});

const knownRoles = new Set(Object.values(ACCESS_ROLES));
const managerRoles = new Set([ACCESS_ROLES.manager, ACCESS_ROLES.admin]);

export function normalizeAccessRole(role) {
  return knownRoles.has(role) ? role : ACCESS_ROLES.collaborator;
}

export function canEditOperations(role) {
  return role !== ACCESS_ROLES.collaborator && knownRoles.has(role);
}

export function canCreateDemand(role) {
  return knownRoles.has(role);
}

export function canAccessPortalPage(role, pageId) {
  const normalizedRole = normalizeAccessRole(role);

  if (pageId === "access") {
    return normalizedRole === ACCESS_ROLES.admin;
  }

  if (pageId === "manager") {
    return managerRoles.has(normalizedRole);
  }

  return true;
}
