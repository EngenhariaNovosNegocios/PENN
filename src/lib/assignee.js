export function normalizeIdentityValue(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function isAssignedTo(record, identity) {
  if (!record || !identity) {
    return false;
  }

  const identityEmail = normalizeIdentityValue(identity.email);
  const assigneeEmail = normalizeIdentityValue(record.assignee_email);

  if (assigneeEmail) {
    return Boolean(identityEmail) && assigneeEmail === identityEmail;
  }

  const assigneeName = normalizeIdentityValue(record.assignee_name);
  const knownNames = new Set(
    [identity.name, ...(identity.names ?? [])]
      .map(normalizeIdentityValue)
      .filter(Boolean)
  );

  return Boolean(assigneeName) && knownNames.has(assigneeName);
}
