export type ServerUser = {
  id: string
  username: string
  displayName: string
  role: string
  isAdmin: boolean
  organizationScope: string
  teamId?: string
  teamName?: string
  department?: string
  departmentHead?: boolean
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api/${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message ?? '请求失败')
  return response.json()
}

export async function getServerSession(): Promise<ServerUser | null> {
  try { return (await request('auth/session')).user } catch { return null }
}

export async function serverLogin(username: string, password: string): Promise<ServerUser> {
  return (await request('auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })).user
}

export async function serverLogout() { await request('auth/logout', { method: 'POST', body: '{}' }) }

export async function getServerUsers() { return request('admin/users') }

export async function saveServerUser(id: string | null, input: Record<string, unknown>) {
  return request(id ? `admin/users/${id}` : 'admin/users', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) })
}

export async function deleteServerUser(id: string) {
  return request(`admin/users/${id}`, { method: 'DELETE' })
}

export async function changeServerPassword(currentPassword: string, nextPassword: string) {
  return request('auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, nextPassword }) })
}

export async function getServerApps() { return request('apps') }
export async function getServerAppPermissions() { return request('admin/app-permissions') }
export async function saveServerAppPermissions(appId: string, roles: string[]) {
  return request(`admin/app-permissions/${appId}`, { method: 'PUT', body: JSON.stringify({ roles }) })
}

export type OrgTeamNode = { team: string; persons: { id: string; role: string; name: string; englishName: string; department: string }[] }
export type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

export async function getOrgTree(): Promise<OrgDeptNode[]> {
  return request('org/tree')
}

export async function addOrgTeam(department: string, team: string) {
  return request('org/teams', { method: 'POST', body: JSON.stringify({ department, team }) })
}
