import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Icon } from './components/Icon'
import { SalesManagementPage } from './components/SalesManagementPage'
import { OrgPickerPage } from './components/OrgPickerPage'
import { OrgChartPage } from './components/OrgChartPage'
import { AccountFieldsPage } from './components/AccountFieldsPage'
import { appUrl, apps, departments, DEPT_COLORS, initialTodos, roles, type AppDefinition, type Department, type Role, type Todo } from './data/workbench'
import { getUsers, isAllowed, saveUsers, type DemoUser, type PermissionMap } from './lib/demo-auth'
import { addAccountFieldRole, addAccountFieldTeam, changeServerPassword, deleteServerUser, getAccountFields, getOrgTree, getServerApps, getServerAppPermissions, getServerSession, getServerUsers, saveServerAppPermissions, saveServerUser, serverLogin, serverLogout, type AccountFields, type OrgDeptNode } from './lib/server-auth'
import { fetchTodos } from './lib/platform-api'
import './styles.css'

function Layout() {
  const [session, setSession] = useState<DemoUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [users, setUsersState] = useState<DemoUser[]>(() => getUsers())
  const [permissions, setPermissionsState] = useState<PermissionMap>({} as PermissionMap)
  const role = session?.role || 'salesperson'
  const setUsers = (next: DemoUser[]) => { saveUsers(next); setUsersState(next) }
  const login = async (username: string, password: string) => { try { const user = await serverLogin(username, password); setSession(user as unknown as DemoUser); return true } catch { return false } }
  useEffect(() => { void getServerSession().then(user => setSession(user as unknown as DemoUser | null)).finally(() => setAuthReady(true)) }, [])
  useEffect(() => { if (!session) return; void getServerApps().then(items => setPermissionsState(Object.fromEntries(items.map((item: any) => [item.id, item.roles])) as PermissionMap)).catch(() => setPermissionsState({} as PermissionMap)) }, [session])
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [todoSource, setTodoSource] = useState<'api' | 'demo'>('demo')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHover, setSidebarHover] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const sidebarTimer = useRef<number | undefined>(undefined)
  const location = useLocation()
  const isDesktopView = () => window.matchMedia('(min-width: 961px)').matches
  const toggleNav = () => {
    if (!isDesktopView()) { setSidebarOpen(open => !open); return }
    // 桌面端：点击汉堡按钮固定/取消固定侧边栏；默认由悬停控制展开
    setSidebarPinned(pinned => !pinned)
  }
  const lastEnterRef = useRef(0)
  const enterSidebar = () => {
    if (!isDesktopView()) return
    if (sidebarTimer.current !== undefined) window.clearTimeout(sidebarTimer.current)
    lastEnterRef.current = Date.now()
    setSidebarHover(true)
  }
  const leaveSidebar = () => {
    if (!isDesktopView()) return
    if (sidebarTimer.current !== undefined) window.clearTimeout(sidebarTimer.current)
    // 展开后 400ms 内不折叠，且折叠延迟 700ms：避免鼠标在侧边栏边缘小幅移动造成菜单反复展开/折叠闪烁
    const elapsed = Date.now() - lastEnterRef.current
    const delay = elapsed < 400 ? 900 : 700
    sidebarTimer.current = window.setTimeout(() => setSidebarHover(false), delay)
  }
  const sidebarCollapsed = isDesktopView() ? !(sidebarHover || sidebarPinned) : false
  const [hasNewNotifications, setHasNewNotifications] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const previousPendingIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    previousPendingIdsRef.current = null
    setHasNewNotifications(false)
    const refreshTodos = async () => {
      try {
        const items = await fetchTodos(role)
        if (!cancelled) {
          const pendingIds = new Set(items.filter(item => !item.completed).map(item => item.id))
          const previous = previousPendingIdsRef.current
          if (previous && [...pendingIds].some(id => !previous.has(id))) setHasNewNotifications(true)
          previousPendingIdsRef.current = pendingIds
          setTodos(items)
          setTodoSource('api')
          setLastSyncedAt(new Date())
        }
      } catch {
        if (!cancelled) {
          setTodos(initialTodos)
          setTodoSource('demo')
          setLastSyncedAt(new Date())
        }
      }
    }
    void refreshTodos()
    const timer = window.setInterval(() => { void refreshTodos() }, 1000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [role])

  const pendingNotifications = todos.filter(item => !item.completed)

  useEffect(() => {
    const remindBeforeClose = (event: BeforeUnloadEvent) => {
      if (!todos.some(item => !item.completed)) return
      event.preventDefault()
      event.returnValue = '您还有未完成待办事项，确认后将关闭工作台。'
      return event.returnValue
    }
    window.addEventListener('beforeunload', remindBeforeClose)
    return () => window.removeEventListener('beforeunload', remindBeforeClose)
  }, [todos])

  useEffect(() => {
    if (!sidebarOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSidebarOpen(false) }
    document.body.classList.add('navigation-open')
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.classList.remove('navigation-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [sidebarOpen])

  if (!authReady) return <main className="login-page"><p>正在验证登录状态…</p></main>
  if (location.pathname === '/org-picker') return <OrgPickerPage />
  if (!session) return <LoginPage onLogin={login} />

  return <div className={`shell ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside id="workspace-sidebar" className="sidebar" aria-label="工作台导航" onMouseEnter={enterSidebar} onMouseLeave={leaveSidebar} onClick={event => { if ((event.target as HTMLElement).closest('a')) setSidebarOpen(false) }}>
      <Link className="brand" to="/" aria-label="返回工作台首页"><span className="brand-mark">V</span><span>Vigor<br /><small>WORKBENCH</small></span></Link>
      <nav className="primary-nav" aria-label="主导航">
        <NavLink end to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-label="工作总览"><Icon name="grid" /><span className="nav-label">工作总览</span></NavLink>
        <NavLink to="/todos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-label="我的待办"><Icon name="check" /><span className="nav-label">我的待办</span><span className="nav-count">{todos.filter(item => !item.completed).length}</span></NavLink>
      </nav>
      <div className="nav-caption">部门应用</div>
      <div className="department-nav">
        {(Object.keys(departments) as Department[]).map(department => <div className="department-item" key={department}>
          <div className="department-title"><span>{departments[department].order}</span>{departments[department].label}</div>
          {apps.filter(app => app.department === department && isAllowed(permissions, role, app)).map(app => <NavLink key={app.id} to={`/workspace/apps/${app.id}`} className={({ isActive }) => `app-nav ${isActive ? 'active' : ''}`} data-label={app.name}><i>{app.shortName.slice(0, 1)}</i><span className="app-label">{app.name}</span></NavLink>)}
        </div>)}
      </div>
      <div className="sidebar-bottom"><Link to="/account" className="nav-item" data-label="个人账号"><Icon name="user" /><span className="nav-label">个人账号</span></Link><Link to="/admin/org-chart" className="nav-item" data-label="组织架构"><Icon name="org" /><span className="nav-label">组织架构</span></Link>{session.isAdmin && <><Link to="/admin/permissions" className="nav-item" data-label="账号与权限"><Icon name="users" /><span className="nav-label">账号与权限</span></Link><Link to="/admin/app-permissions" className="nav-item" data-label="岗位与权限"><Icon name="user-check" /><span className="nav-label">岗位与权限</span></Link><Link to="/admin/api-services" className="nav-item" data-label="服务与授权"><Icon name="key" /><span className="nav-label">服务与授权</span></Link><Link to="/settings" className="nav-item" data-label="接入设置"><Icon name="sliders" /><span className="nav-label">接入设置</span></Link></>}<p>平台版本 0.2<br />{todoSource === 'api' ? 'BFF 待办已连接' : '演示数据环境'}</p></div>
    </aside>
    <button className="sidebar-backdrop" type="button" aria-label="关闭导航" tabIndex={sidebarOpen ? 0 : -1} onClick={() => setSidebarOpen(false)} />
    <main className="main-content">
      <header className="topbar">
        <div className="topbar-leading"><button className="navigation-toggle" type="button" aria-label={sidebarOpen ? '关闭主导航' : sidebarPinned ? '取消固定侧边栏' : '固定侧边栏'} aria-expanded={sidebarOpen || !sidebarCollapsed} aria-controls="workspace-sidebar" onClick={toggleNav}><span /><span /><span /></button><div className="crumb"><span>VIGOR</span><b>/</b><span>统一办公平台</span></div></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="搜索"><Icon name="search" /></button>
          <div className="notification-wrap">
            <button className={`icon-button notification ${hasNewNotifications ? 'has-new' : ''}`} type="button" aria-label={`通知：${pendingNotifications.length} 项未读`} aria-expanded={notificationOpen} aria-controls="notification-panel" onClick={() => { setNotificationOpen(open => !open); setHasNewNotifications(false) }}>
              <Icon name="bell" />
              {pendingNotifications.length > 0 && <i>{pendingNotifications.length}</i>}
            </button>
            {notificationOpen && <NotificationPanel todos={pendingNotifications} lastSyncedAt={lastSyncedAt} onClose={() => setNotificationOpen(false)} />}
          </div>
          <div className="account-menu"><span>{session.displayName}</span><small>{session.isAdmin ? '管理员' : roles[role].label}</small></div>
          <button className="logout-button" type="button" onClick={() => { void serverLogout().finally(() => setSession(null)) }}>退出</button>
          <div className="avatar" title={session.displayName}>{session.displayName.slice(0, 1)}</div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Overview todos={todos} role={role} permissions={permissions} todoSource={todoSource} lastSyncedAt={lastSyncedAt} />} />
        <Route path="/todos" element={<TodoPage todos={todos} todoSource={todoSource} lastSyncedAt={lastSyncedAt} />} />
        <Route path="/workspace/apps/:appId" element={<ApplicationPage role={role} permissions={permissions} session={session} />} />
        <Route path="/account" element={<PersonalAccountPage currentUser={session} />} />
        <Route path="/admin/permissions" element={<PermissionAdminPage currentUser={session} />} />
        <Route path="/admin/app-permissions" element={<AppPermissionAdmin currentUser={session} />} />
        <Route path="/admin/org-chart" element={<OrgChartPage />} />
        <Route path="/admin/api-integrations" element={<ApiIntegrationPage currentUser={session} mode="services" />} />
        <Route path="/admin/api-services" element={<ApiIntegrationPage currentUser={session} mode="services" />} />
        <Route path="/admin/api-grants" element={<ApiIntegrationPage currentUser={session} mode="grants" />} />
        <Route path="/settings" element={<SettingsPage currentUser={session} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  </div>
}

function notificationMeta(todo: Todo): { label: string; href: string } {
  if (todo.source.includes('审批')) return { label: '待审批', href: '/todos' }
  if (todo.source.includes('陪练')) return { label: '销售能力', href: '/workspace/apps/ai-sales-coach' }
  if (todo.source.includes('提成')) return { label: '财务核算', href: '/workspace/apps/sales-commission' }
  return { label: '协同计划', href: '/todos' }
}

function NotificationPanel({ todos, lastSyncedAt, onClose }: { todos: Todo[]; lastSyncedAt: Date | null; onClose: () => void }) {
  const syncText = lastSyncedAt ? `每秒更新 · ${lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '正在同步'
  return <section id="notification-panel" className="notification-panel" role="dialog" aria-label="实时通知">
    <div className="notification-heading"><div><p className="eyebrow">LIVE NOTIFICATIONS</p><h2>实时提醒</h2></div><span className="notification-sync"><Icon name="clock" size={13} />{syncText}</span></div>
    {todos.length ? <div className="notification-list">{todos.slice(0, 5).map(todo => { const meta = notificationMeta(todo); return <Link to={meta.href} className="notification-item" key={todo.id} onClick={onClose}><span className={`notification-priority ${todo.priority}`} /><span><em>{meta.label}</em><b>{todo.title}</b><small>{todo.source} · {todo.due}</small></span><Icon name="arrow" size={15} /></Link> })}</div> : <div className="notification-empty"><Icon name="check" size={19} /><span>暂无待处理提醒</span></div>}
    <Link to="/todos" className="notification-footer" onClick={onClose}>进入待办中心 <Icon name="arrow" size={15} /></Link>
  </section>
}

function Overview({ todos, role, permissions, todoSource, lastSyncedAt }: { todos: Todo[]; role: Role; permissions: PermissionMap; todoSource: 'api' | 'demo'; lastSyncedAt: Date | null }) {
  const pending = todos.filter(item => !item.completed)
  const availableApps = apps.filter(app => isAllowed(permissions, role, app))
  const approvalCount = pending.filter(item => item.source.includes('审批')).length
  const riskCount = pending.filter(item => item.priority === 'high').length
  const dateText = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
  const syncText = lastSyncedAt ? lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '正在同步'
  return <section className="page overview-page">
    <div className="page-title-row"><div><p className="eyebrow">{dateText}</p><h1>今天，先把关键事项推进。</h1><p className="subtle">当前为 <b>{roles[role].label}</b> 视图；仅展示该岗位已获授权的应用和待办。</p></div><Link to="/todos" className="plain-action">查看全部待办 <Icon name="arrow" /></Link></div>
    <section className="signal-bar" aria-label="今日工作信号"><div><span className="signal-number">{pending.length}</span><span>待办事项</span></div><div><span className="signal-number">{approvalCount}</span><span>待审批</span></div><div className={riskCount ? 'risk' : ''}><span className="signal-number">{riskCount}</span><span>需关注</span></div><div className="signal-note"><Icon name="clock" />{todoSource === 'api' ? '已同步 ' + syncText : '演示数据环境'}</div></section>
    <div className="overview-grid"><section className="ledger-panel"><div className="panel-heading"><div><p className="eyebrow">ACTION QUEUE</p><h2>我的待办</h2></div><span className="today-tag">系统跟踪</span></div><TodoList todos={pending.slice(0, 4)} compact /><Link className="panel-footer" to="/todos">进入待办中心 <Icon name="arrow" /></Link></section><section className="operating-panel"><div className="panel-heading"><div><p className="eyebrow">MODULE STATUS</p><h2>可用模块</h2></div><span className="live-dot">已授权</span></div><div className="module-list">{availableApps.map((app, index) => <Link className="module-row" key={app.id} to={'/workspace/apps/' + app.id}><span className="module-index">{String(index + 1).padStart(2, '0')}</span><span className="module-name">{app.name}<small>{departments[app.department].label} · {app.description}</small></span><span className={'status ' + app.state}>{app.state === 'ready' ? '已验证连接' : '待完成配置'}</span><Icon name="arrow" /></Link>)}</div></section></div>
    <section className="apps-section"><div className="section-heading"><div><p className="eyebrow">APPLICATION DIRECTORY</p><h2>部门应用</h2></div><span>可使用 {availableApps.length} 个系统</span></div><div className="app-directory">{availableApps.map(app => <AppDirectoryItem key={app.id} app={app} role={role} permissions={permissions} />)}</div></section>
    <section className="platform-notice"><Icon name="shield" /><div><b>平台边界已设定</b><p>工作台统一入口、待办和权限上下文；业务数据仍由各应用负责。跨系统数据通过 API、事件与映射表接入，不允许直接写入其他模块数据库。</p></div><Link to="/settings">查看接入设置 <Icon name="arrow" /></Link></section>
  </section>
}
function TodoList({ todos, compact = false }: { todos: Todo[]; compact?: boolean }) {
  if (!todos.length) return <div className="empty-list"><Icon name="check" size={22} /><p>所有待办已由业务流程处理完成。</p></div>
  return <div className={'todo-list ' + (compact ? 'compact' : '')}>{todos.map((todo, index) => <article className={'todo-row ' + (todo.completed ? 'done' : '')} key={todo.id}><span className="todo-status" title="由业务流程自动更新"><Icon name={todo.completed ? 'check' : 'clock'} size={15} /></span><span className="todo-index">{String(index + 1).padStart(2, '0')}</span><div className="todo-copy"><h3>{todo.title}</h3><span>{todo.source} · 系统跟踪</span></div><time className={'priority ' + todo.priority}>{todo.due}</time></article>)}</div>
}

function TodoPage({ todos, todoSource, lastSyncedAt }: { todos: Todo[]; todoSource: 'api' | 'demo'; lastSyncedAt: Date | null }) {
  const active = todos.filter(todo => !todo.completed)
  const completed = todos.filter(todo => todo.completed)
  const syncText = lastSyncedAt ? lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '正在同步'
  return <section className="page todo-page"><div className="page-title-row"><div><p className="eyebrow">PERSONAL ACTION CENTER</p><h1>待办中心</h1><p className="subtle">待办由审批、合同、项目与跨部门计划等实际业务操作自动更新，不能手工勾选完成。</p></div><span className="today-tag">{todoSource === 'api' ? '实时同步 · ' + syncText : '演示数据环境'}</span></div><section className="wide-ledger"><div className="panel-heading"><div><p className="eyebrow">OPEN ITEMS</p><h2>{active.length} 项待处理</h2></div><span className="today-tag">每日自动更新</span></div><TodoList todos={active} /></section>{completed.length > 0 && <section className="wide-ledger completed"><div className="panel-heading"><h2>已完成（流程已确认）</h2></div><TodoList todos={completed} /></section>}</section>
}

function AppDirectoryItem({ app, role, permissions }: { app: AppDefinition; role: Role; permissions: PermissionMap }) {
  const permitted = isAllowed(permissions, role, app)
  return <article className="directory-item"><div className="directory-order">{departments[app.department].order}</div><div className="directory-content"><p>{departments[app.department].label}</p><h3>{app.name}</h3><span>{app.description}</span></div><div className="directory-actions">{permitted ? <Link to={`/workspace/apps/${app.id}`}>打开模块 <Icon name="arrow" /></Link> : <span className="locked"><Icon name="lock" size={14} />当前角色无权访问</span>}</div></article>
}

function ApplicationPage({ role, permissions, session }: { role: Role; permissions: PermissionMap; session: DemoUser }) {
  const { appId } = useParams()
  const app = apps.find(item => item.id === appId)
  const url = app ? appUrl(app) : undefined
  if (!app) return <NotFound />
  const permitted = isAllowed(permissions, role, app)
  return <section className="application-page"><div className="page-title-row"><div><p className="eyebrow">{departments[app.department].order} · {departments[app.department].label.toUpperCase()} / 已接入应用</p><h1>{app.name}</h1><p className="subtle">{app.description}</p></div><Link to="/" className="plain-action">返回工作总览 <Icon name="arrow" /></Link></div><div className="module-meta"><span><Icon name="shield" size={15} />访问范围：{roles[role].scope}</span><span><Icon name="clock" size={15} />平台统一传递身份与权限</span></div>{!permitted ? <PermissionState app={app} /> : app.id === 'sales-management' ? <SalesManagementPage /> : url ? <EmbeddedApp app={app} url={url} session={session} /> : <ConfigurationState app={app} />}</section>
}
function EmbeddedApp({ app, url, session }: { app: AppDefinition; url: string; session: DemoUser }) {
  const [failed, setFailed] = useState(false)
  const [embedHeight, setEmbedHeight] = useState<number | undefined>()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type === 'vigor.workbench.embed.resize.v1' && event.data?.appId === app.id) {
        const requestedHeight = Number(event.data.height)
        if (Number.isFinite(requestedHeight)) setEmbedHeight(Math.min(Math.max(Math.ceil(requestedHeight), 620), 20000))
        return
      }
      if (app.id !== 'ai-sales-coach' || event.data?.type !== 'vigor.workbench.auth.request.v1') return
      try {
        const response = await fetch('/api/auth/bridge', { method:'POST', headers:{'Content-Type':'application/json','X-Demo-Role':session.role}, body:JSON.stringify({id:session.id,username:session.username,displayName:session.displayName,role:session.role,isAdmin:session.isAdmin===true,appId:app.id}) })
        if(!response.ok) throw new Error('bridge')
        const bridge=await response.json() as {token:string}
        iframeRef.current?.contentWindow?.postMessage({type:'vigor.workbench.auth.response.v1',token:bridge.token},window.location.origin)
      } catch { setFailed(true) }
    }
    window.addEventListener('message',receive); return ()=>window.removeEventListener('message',receive)
  },[app.id,session])
  return <section className="embed-wrap">{failed ? <div className="state-card"><Icon name="alert" size={26}/><h2>模块暂时无法载入</h2><p>工作台身份桥接暂不可用，请返回总览后重试。</p><Link to="/">返回工作总览</Link></div> : <iframe title={app.name} src={url} ref={iframeRef} style={embedHeight ? { height: `${embedHeight}px`, minHeight: `${embedHeight}px` } : undefined} referrerPolicy="strict-origin" onError={()=>setFailed(true)}/>}</section>
}

function ConfigurationState({ app }: { app: AppDefinition }) {
  return <section className="state-card configuration"><span className="state-number">{departments[app.department].order}</span><Icon name="settings" size={28} /><h2>等待网关地址配置</h2><p>在平台根目录的 <code>.env</code> 配置 <code>{app.urlEnv}</code>，并由 Nginx 将该地址代理到已部署的 {app.name}。不要使用 GitHub 或第三方站点地址嵌入。</p><div className="state-actions"><Link to="/settings" className="primary-button">查看接入说明 <Icon name="arrow" /></Link></div></section>
}

function PermissionState({ app }: { app: AppDefinition }) {
  return <section className="state-card permission"><Icon name="lock" size={28} /><h2>当前演示角色没有访问权限</h2><p>{app.name} 仅开放给：{app.access.map(role => roles[role].label).join('、')}。接入 Keycloak 与平台 BFF 后，必须由服务端执行该权限规则。</p></section>
}

function SettingsPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  if (currentUser?.isAdmin !== true) return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可查看接入设置</h2></div></section>
  return <section className="page settings-page"><div className="page-title-row"><div><p className="eyebrow">INTEGRATION CONTROL</p><h1>接入设置</h1><p className="subtle">这里列出首批应用的接入契约。当前为只读说明页。</p></div></div><section className="settings-ledger">{apps.map(app => <div className="setting-row" key={app.id}><div><span className="setting-key">{app.urlEnv}</span><h2>{app.name}</h2><p>部署后通过 <code>/apps/{app.id}/</code> 同域反向代理；平台禁止直接读写该应用数据库。</p></div><span className="status ready">已接入</span></div>)}</section><section className="platform-notice"><Icon name="alert" /><div><b>生产环境前置条件</b><p>合并三个应用的接入改造 PR、部署统一网关、配置 OIDC 单点登录、建立平台 API 审计与事件同步后，再对内开放真实入口。</p></div></section></section>
}

type ApiService={id:string;name:string;endpoint:string;enabled:boolean;apiKeyConfigured:boolean;apiKeyMasked:string|null}
function ApiIntegrationPage({currentUser,mode}:{currentUser:DemoUser;mode:'services'|'grants'}){
 const [services,setServices]=useState<ApiService[]>([]),[serviceId,setServiceId]=useState(''),[appId,setAppId]=useState('ai-sales-coach'),[grants,setGrants]=useState<string[]>([]),[name,setName]=useState(''),[apiKey,setApiKey]=useState(''),[enabled,setEnabled]=useState(false),[message,setMessage]=useState(''),[activeMode,setActiveMode]=useState<'services'|'grants'>(mode)
 const selected=services.find(s=>s.id===serviceId)
 const headers={'X-Workbench-Admin':'true'}
 const loadServices=async()=>{const r=await fetch('/api/admin/api-services',{headers});if(!r.ok)throw new Error();const data=await r.json() as ApiService[];setServices(data);if(!serviceId&&data[0])choose(data[0].id,data)}
 const choose=(id:string,data=services)=>{const x=data.find(s=>s.id===id);setServiceId(id);setName(x?.name||'');setEnabled(x?.enabled||false);setApiKey('')}
 const loadGrants=async(next=appId)=>{const r=await fetch('/api/admin/app-grants/'+next,{headers});if(!r.ok)throw new Error();setGrants((await r.json()).serviceIds||[])}
 useEffect(()=>{if(currentUser.isAdmin){void loadServices().catch(()=>setMessage('暂时无法读取 API 服务。'));void loadGrants().catch(()=>setMessage('暂时无法读取应用授权。'))}},[currentUser.isAdmin])
 const showServices=activeMode==='services'
 if(!currentUser.isAdmin)return <section className="page"><div className="state-card permission"><Icon name="lock" size={28}/><h2>仅管理员可配置 API 服务</h2></div></section>
 const saveService=async(e:FormEvent)=>{e.preventDefault();const id=serviceId||name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');if(!id){setMessage('请填写服务名称。');return};setMessage('正在保存 API 服务…');const r=await fetch('/api/admin/api-services/'+id,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({name,enabled,apiKey})});if(!r.ok){setMessage('保存失败，请检查服务地址。');return};setApiKey('');await loadServices();setServiceId(id);setMessage('API 服务已集中保存。')}
 const toggleGrant=async(id:string)=>{const next=grants.includes(id)?grants.filter(x=>x!==id):[...grants,id];setGrants(next);const r=await fetch('/api/admin/app-grants/'+appId,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({serviceIds:next})});if(!r.ok){await loadGrants();setMessage('授权保存失败。');return};setMessage('应用授权已更新。')}
 return <section className="page api-page"><div className="api-heading"><div><h1>{showServices?'API 服务库':'应用 API 授权'}</h1><p>{showServices?'集中维护 API 地址、密钥和启用状态；密钥不会提供给浏览器或小程序。':'选择一个小程序，授予它可调用的已启用 API 服务。'}</p></div><span className="admin-seal"><Icon name="shield" size={14}/>管理员专属</span></div><div className="api-tabs"><button type="button" className={activeMode==='services'?'active':''} onClick={()=>setActiveMode('services')}>API 服务库</button><button type="button" className={activeMode==='grants'?'active':''} onClick={()=>setActiveMode('grants')}>应用 API 授权</button></div><div className={showServices?"api-layout":"api-layout grants-only"}>{showServices&&<section className="api-registry"><div className="api-section-head"><div><h2>API 服务库</h2><p>统一维护地址、密钥与启用状态。</p></div><button className="api-add" type="button" onClick={()=>{setServiceId('');setName('');setApiKey('');setEnabled(false)}}>新增服务</button></div><div className="api-app-list">{services.length?services.map(s=><button type="button" className={'api-app-item '+(serviceId===s.id?'active':'')} key={s.id} onClick={()=>choose(s.id)}><i>{s.name.slice(0,1)}</i><span><b>{s.name}</b><small>{s.apiKeyConfigured?'密钥已配置':'尚未配置密钥'}</small></span><em className={s.enabled?'enabled':'idle'}>{s.enabled?'已启用':'已停用'}</em></button>):<p className="api-empty">尚未创建 API 服务。</p>}</div></section>}<section className="api-editor">{showServices&&<form onSubmit={saveService}><div className="api-section-head"><div><h2>{serviceId?'编辑 API 服务':'新增 API 服务'}</h2><p>只需填写服务名称与密钥；密钥仅由工作台保存。</p></div></div><div className="api-form-grid"><label>服务名称<input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：OpenAI / 腾讯 COS / ERP"/></label><label>访问密钥<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={selected?.apiKeyMasked||'输入后仅保存至服务器'}/><small>{selected?.apiKeyConfigured?'已配置：'+selected.apiKeyMasked:'尚未配置密钥'}</small></label></div><label className="api-switch"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span><b>启用此 API 服务</b><small>停用后所有已授权应用均无法调用。</small></span></label><div className="api-actions"><button className="primary-button">保存服务 <Icon name="arrow"/></button>{serviceId&&<button className="danger-button" type="button" onClick={async()=>{if(!window.confirm('删除“'+(selected?.name||serviceId)+'”后，所有小程序对此 API 的授权会同时撤销。确认删除？'))return;setMessage('正在删除 API 服务…');const r=await fetch('/api/admin/api-services/'+serviceId,{method:'DELETE',headers});if(!r.ok){setMessage('删除失败，请稍后重试。');return};setServiceId('');setName('');setApiKey('');setEnabled(false);setGrants([]);await loadServices();await loadGrants();setMessage('API 服务已删除，相关授权已撤销。')}}>删除服务</button>}<span className={message.startsWith('API')||message.startsWith('应用')?'success':''}>{message||'服务配置与应用授权分开管理。'}</span></div></form>}{!showServices&&<div className="api-grants"><div className="api-section-head"><div><h2>授权给小程序</h2><p>只有勾选的应用能看到并请求该服务。</p></div></div><label className="api-grant-select">选择小程序<select value={appId} onChange={e=>{setAppId(e.target.value);void loadGrants(e.target.value)}}>{apps.map(app=><option key={app.id} value={app.id}>{app.name}</option>)}</select></label><div className="grant-list">{services.filter(s=>s.enabled).map(s=><label key={s.id} className="grant-row"><input type="checkbox" checked={grants.includes(s.id)} onChange={()=>void toggleGrant(s.id)}/><span><b>{s.name}</b><small>{s.apiKeyConfigured?'密钥已由工作台保管':'未配置密钥'}</small></span><em>{grants.includes(s.id)?'已授权':'未授权'}</em></label>)}{!services.some(s=>s.enabled)&&<p className="api-empty">请先创建并启用 API 服务。</p>}</div></div>}</section></div></section>
}

function NotFound() { return <section className="page"><div className="state-card"><Icon name="alert" size={28} /><h2>页面不存在</h2><p>请选择左侧工作模块，或返回总览。</p><Link to="/" className="primary-button">返回工作总览 <Icon name="arrow" /></Link></div></section> }




function LoginPage({ onLogin }: { onLogin: (username:string,password:string)=>Promise<boolean> }) { const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const submit=async(event:FormEvent)=>{event.preventDefault();if(!await onLogin(username,password))setError('账号或密码不正确，请联系管理员。')}; return <main className="login-page"><section className="login-card"><div className="login-brand"><span>V</span><div><b>Vigor</b><small>WORKBENCH</small></div></div><h1>登录工作台</h1><p>使用管理员配置的账号进入。新增功能默认未授权，须由管理员配置后才可使用。</p><form onSubmit={submit}><label>账号<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} /></label><label>密码<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>{error&&<p className="login-error">{error}</p>}<button className="primary-button">登录工作台 <Icon name="arrow" /></button></form></section></main> }
function PersonalAccountPage({ currentUser }: { currentUser: DemoUser }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { await changeServerPassword(currentPassword, nextPassword); setCurrentPassword(''); setNextPassword(''); setMessage('密码已更新。下次登录请使用新密码。') }
    catch (error) { setMessage(error instanceof Error ? error.message : '修改失败，请重试。') }
  }
  const roleLabel = roles[currentUser.role as Role]?.label ?? currentUser.role
  return <section className="page personal-account-page"><div className="page-heading"><h1>个人账号</h1><p>查看您的工作台身份与岗位范围，并维护登录密码。</p></div><section className="account-profile"><div className="account-profile-mark">{currentUser.displayName.slice(0, 1)}</div><div><h2>{currentUser.displayName}</h2><p>{currentUser.username} · 工作台账号</p></div><div className="account-profile-meta"><span>当前岗位</span><b>{roleLabel}</b></div><div className="account-profile-meta"><span>账号状态</span><b className="profile-active">已启用</b></div></section><div className="account-page-grid"><section className="account-security-panel"><header><div><h2>登录安全</h2><p>密码至少 8 位。修改后不会影响已部署应用中的业务资料。</p></div><span>仅本人可修改</span></header><form className="password-form" onSubmit={submit}><label>当前密码<input required autoComplete="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label><label>新密码<input required minLength={8} autoComplete="new-password" type="password" value={nextPassword} onChange={e => setNextPassword(e.target.value)} /></label><button className="primary-button">保存新密码</button></form>{message && <p className="account-feedback" role="status">{message}</p>}</section><aside className="account-scope-note"><h2>访问范围</h2><p>{(currentUser as any).organizationScope || roles[currentUser.role as Role]?.scope || '按管理员配置的岗位范围访问。'}</p><small>应用入口权限由管理员在“应用岗位权限”中统一配置。</small></aside></div></section>
}

function PermissionAdminPage({ currentUser }: { currentUser: DemoUser }) {
  const [users, setUsers] = useState<any[]>([])
  const [orgDepts, setOrgDepts] = useState<OrgDeptNode[]>([])
  const [accountFields, setAccountFields] = useState<AccountFields | null>(null)
  const [adminView, setAdminView] = useState<'accounts' | 'fields'>('accounts')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<any>(null)
  const empty = { username: '', displayName: '', role: 'salesperson', password: '', department: '', teamName: '', isAdmin: false, disabled: false, departmentHead: false, addingRole: false, addingTeam: false, newTeam: '', prevRole: '' }
  const refresh = async () => { try { setUsers(await getServerUsers()) } catch { setNotice('无法读取账号列表，请重新登录后再试。') } }
  const refreshOrg = async () => { try { const [d, f] = await Promise.all([getOrgTree(), getAccountFields().catch(() => null)]); setOrgDepts(d); setAccountFields(f) } catch { /* 下拉不可用时仍可创建账号 */ } }
  useEffect(() => { void refresh(); void refreshOrg() }, [])
  const save = async (event: FormEvent) => {
    event.preventDefault()
    const role = (draft.role ?? '').trim()
    if (!role) { setNotice('请选择或填写岗位。'); return }
    if (!draft.department) { setNotice('请选择部门。'); return }
    const payload: Record<string, unknown> = {
      username: draft.username, displayName: draft.displayName, role,
      isAdmin: draft.isAdmin === true, disabled: draft.disabled === true,
      department: draft.department, teamName: draft.teamName || undefined,
      departmentHead: draft.departmentHead === true,
      ...(draft.password ? { password: draft.password } : {}),
    }
    try { await saveServerUser(draft.id ?? null, payload); setNotice(draft.id ? '账号资料已更新。' : '新账号已创建。'); setDraft(null); await refresh(); await refreshOrg() }
    catch (error) { setNotice(error instanceof Error ? error.message : '保存失败，请重试。') }
  }
  const addTeam = async () => {
    const name = (draft.newTeam ?? '').trim()
    if (!name) { setNotice('请输入小组名称。'); return }
    try { await addAccountFieldTeam(draft.department, name); await refreshOrg(); setDraft({ ...draft, teamName: name, addingTeam: false, newTeam: '' }) }
    catch (error) { setNotice(error instanceof Error ? error.message : '新增小组失败。') }
  }
  const toggleDisabled = async (user: any) => {
    try { await saveServerUser(user.id, { username: user.username, displayName: user.displayName, role: user.role, isAdmin: user.isAdmin, disabled: !user.disabled, department: user.department, teamName: user.teamName, departmentHead: user.departmentHead === true }); await refresh() }
    catch (error) { setNotice(error instanceof Error ? error.message : '操作失败。') }
  }
  const remove = async (user: any) => {
    if (!window.confirm(`确定删除账号「${user.displayName}（${user.username}）」？此操作不可恢复。`)) return
    try { await deleteServerUser(user.id); setNotice('账号已删除。'); await refresh() }
    catch (error) { setNotice(error instanceof Error ? error.message : '删除失败。') }
  }
  if (!currentUser.isAdmin) return <section className="page"><div className="state-card"><h2>无管理权限</h2><p>仅管理员可修改账号与岗位。</p></div></section>

  // 岗位 → 部门（回退推导；账号存在 department 字段时优先使用）
  const ROLE_DEPT: Record<string, string> = {
    '总经理': '总经理办公室', '分管销售副总': '总经理办公室', '分管财务副总': '总经理办公室',
    '人力总监': '人力总经办', '行政专员': '人力总经办',
    '销售经理': '销售部', '销售组长': '销售部', '销售员': '销售部', '项目跟进员': '销售部',
    '采购经理': '采购部', '采购组长': '采购部', '采购员': '采购部', '质量组': '采购部',
    '销售支持组': '销售支持组', '销售支持组组长': '销售支持组',
    '市场组': '市场运营组', '市场运营组组长': '市场运营组',
    '船务经理': '船务部', '船务操作员': '船务部', '财务经理': '财务部', '会计': '财务部',
  }
  const DEPT_ORDER = ['总经理办公室', '人力总经办', '销售部', '采购部', '销售支持组', '市场运营组', '船务部', '财务部']
  const deptOf = (user: any) => user.department || ROLE_DEPT[roles[user.role as Role]?.label ?? user.role] || '其他'
  // 部门主管 = 该部门最高岗位（岗位与部门联动）
  const DEFAULT_HEAD_ROLE: Record<string, string> = {
    '总经理办公室': 'general_manager', '人力总经办': 'hr_director',
    '销售部': 'sales_manager', '采购部': 'procurement_manager',
    '销售支持组': '销售支持组组长', '市场运营组': '市场运营组组长',
    '船务部': 'shipping_manager', '财务部': 'finance_manager',
  }
  const headRoleOf = (department: string) => accountFields?.headRoles?.[department] || DEFAULT_HEAD_ROLE[department]
  const isHeadRole = (department: string, role: string) => Boolean(department && headRoleOf(department) === role)
  const byDept = new Map<string, any[]>()
  for (const u of users) { const d = deptOf(u); if (!byDept.has(d)) byDept.set(d, []); byDept.get(d)!.push(u) }

  // 岗位下拉：内置岗位 + 账号中已出现的自定义岗位 + “新增岗位…”
  const roleOptions = useMemo(() => {
    const builtin = Object.entries(roles).map(([id, item]) => ({ value: id, label: item.label }))
    const fromUsers = [...new Set(users.map(u => String(u.role || '').trim()).filter(r => r && !roles[r as Role]))]
    const custom = [...new Set([...(accountFields?.customRoles ?? []), ...fromUsers])].map(r => ({ value: r, label: r }))
    return [...builtin, ...custom]
  }, [users, accountFields])
  const teamsOf = (department: string) => accountFields?.teams?.[department] ?? orgDepts.find(d => d.department === department)?.teams.map(t => t.team) ?? []
  // 岗位下拉选项：内置 + 自定义 + 当前草稿岗位（保证“新增岗位”后下拉能正确回显，避免必填校验拦截提交）
  const allRoleOptions = useMemo(() => {
    const list = [...roleOptions]
    const cur = draft ? String(draft.role || '').trim() : ''
    if (cur && !list.some(o => o.value === cur)) list.unshift({ value: cur, label: cur })
    return list
  }, [roleOptions, draft])

  const renderCard = (user: any) => {
    const roleLabel = roles[user.role as Role]?.label ?? user.role
    return <div className={'account-card' + (draft?.id === user.id ? ' editing' : '')} key={user.id}>
      <span className="account-directory-mark">{user.displayName.slice(0, 1)}</span>
      <div className="account-card-main">
        <b>{user.displayName}</b>
        <small>@{user.username}</small>
        <div className="account-card-badges">
          <em className="role">{roleLabel}</em>
          {user.isAdmin && <em className="admin">管理员</em>}
          {user.departmentHead && <em className="head">部门主管</em>}
          <em className={user.disabled ? 'off' : 'on'}>{user.disabled ? '已停用' : '已启用'}</em>
        </div>
      </div>
      <div className="account-card-actions">
        <button type="button" onClick={() => setDraft({ ...user, password: '', department: user.department || deptOf(user), addingRole: false, addingTeam: false, newTeam: '', prevRole: user.role })}>编辑</button>
        <button type="button" onClick={() => void toggleDisabled(user)}>{user.disabled ? '启用' : '停用'}</button>
        <button type="button" className="danger" onClick={() => void remove(user)}>删除</button>
      </div>
    </div>
  }

  return <section className="page account-admin-page">
    <div className="page-heading">
      <div><h1>账号与权限</h1><p>按部门查看与管理账号；岗位决定数据范围，应用入口权限请在“岗位与权限”中配置。</p></div>
      <div className="page-heading-actions"><button type="button" className="primary-button" onClick={() => setDraft({ ...empty, password: 'Vigor@2026' })}>新增账号 <Icon name="arrow" /></button><button type="button" className="text-action" onClick={() => { void refresh(); void refreshOrg() }}>刷新列表</button></div>
    </div>
    <div className="api-tabs">
      <button type="button" className={adminView === 'accounts' ? 'active' : ''} onClick={() => setAdminView('accounts')}>账号列表</button>
      <button type="button" className={adminView === 'fields' ? 'active' : ''} onClick={() => setAdminView('fields')}>字段管理</button>
    </div>

    <div style={{ display: adminView === 'accounts' ? undefined : 'none' }}>
    {notice && <p className="account-feedback" role="status">{notice}</p>}

    <div className="account-depts">
      {DEPT_ORDER.concat(['其他']).map(dept => {
        const list = byDept.get(dept) || []
        if (!list.length) return null
        // 销售部与采购部按小组分块展示；小组顺序按组织架构中的排序（销售 V1–V5，采购 一组/二组/质量组）
        const orgOrder = orgDepts.find(d => d.department === dept)?.teams.map(t => t.team) ?? []
        const subTeams = (dept === '销售部' || dept === '采购部') ? [...new Set(list.map(u => u.teamName).filter(Boolean))].filter(t => orgOrder.includes(t)) : []
        subTeams.sort((a, b) => orgOrder.indexOf(a) - orgOrder.indexOf(b))
        const headFirst = (arr: any[]) => [...arr].sort((a, b) => Number(b.departmentHead === true) - Number(a.departmentHead === true))
        const accent = DEPT_COLORS[dept] || '#15202c'
        const deptHeads = list.filter(u => u.departmentHead)
        return <section className="account-dept" key={dept} style={{ borderTop: `3px solid ${accent}` }}>
          <header className="account-dept-head"><span className="account-dept-mark" style={{ background: accent }}>{dept.slice(0, 1)}</span><h2>{dept}</h2>{deptHeads.map(h => <span className="account-dept-head-chip" key={h.id}><i style={{ background: accent }}>{h.displayName.slice(0, 1)}</i>{h.displayName} · 主管</span>)}<small>{list.length} 个账号</small></header>
          <div className="account-dept-body">
            {subTeams.length > 1 ? <>{subTeams.map(team => (
              <div className="account-team-group" key={team}>
                <div className="account-team-title">{team}</div>
                <div className="account-cards">{headFirst(list.filter(u => u.teamName === team)).map(renderCard)}</div>
              </div>
            ))}{(() => { const rest = headFirst(list.filter(u => !subTeams.includes(u.teamName))); return rest.length ? <div className="account-team-group"><div className="account-team-title">未分组</div><div className="account-cards">{rest.map(renderCard)}</div></div> : null })()}</> : <div className="account-cards">{headFirst(list).map(renderCard)}</div>}
          </div>
        </section>
      })}
    </div>

    </div>

    <div style={{ display: adminView === 'fields' ? undefined : 'none' }}>
      <AccountFieldsPage />
    </div>

    {draft && <div className="org-modal-backdrop" onClick={() => setDraft(null)}>
      <form className="org-modal" onClick={e => e.stopPropagation()} onSubmit={save}>
        <h3>{draft.id ? '编辑账号' : '新建账号'}</h3>
        <div className="org-modal-fields">
          <label>账号<input required value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value })} placeholder="例如：judy" /></label>
          <label>姓名<input required value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} placeholder="员工姓名" /></label>
          <label>部门<select required value={draft.department ?? ''} onChange={e => { const dept = e.target.value; setDraft({ ...draft, department: dept, teamName: '', addingTeam: false, newTeam: '', departmentHead: isHeadRole(dept, draft.role) ? (draft.id ? draft.departmentHead : true) : false }) }}>
            <option value="" disabled>请选择部门</option>
            {(accountFields?.departments ?? orgDepts.map(d => d.department)).map(d => <option key={d} value={d}>{d}</option>)}
          </select></label>
          {draft.department && <label>小组{draft.addingTeam ? (
            <span className="org-modal-inline-add"><input autoFocus required value={draft.newTeam ?? ''} onChange={e => setDraft({ ...draft, newTeam: e.target.value })} placeholder="小组名称，如 V6(新星组)" /><button type="button" onClick={() => void addTeam()}>添加</button><button type="button" onClick={() => setDraft({ ...draft, addingTeam: false, newTeam: '' })}>取消</button></span>
          ) : (
            <select value={draft.teamName ?? ''} onChange={e => {
              if (e.target.value === '__new__') setDraft({ ...draft, addingTeam: true, newTeam: '' })
              else setDraft({ ...draft, teamName: e.target.value })
            }}>
              <option value="">暂不分组</option>
              {teamsOf(draft.department).map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__new__">＋ 新增小组…</option>
            </select>
          )}</label>}
          <label>岗位{draft.addingRole ? (
            <span className="org-modal-inline-add"><input autoFocus required value={draft.role ?? ''} onChange={e => setDraft({ ...draft, role: e.target.value })} placeholder="新岗位名称，如 培训专员" /><button type="button" onClick={() => setDraft({ ...draft, addingRole: false, departmentHead: isHeadRole(draft.department, (draft.role ?? '').trim()) ? (draft.id ? draft.departmentHead : true) : false })}>确定</button><button type="button" onClick={() => setDraft({ ...draft, addingRole: false, role: draft.prevRole || 'salesperson' })}>取消</button></span>
          ) : (
            <select required value={allRoleOptions.some(o => o.value === draft.role) ? draft.role : ''} onChange={e => {
              if (e.target.value === '__new_role__') setDraft({ ...draft, addingRole: true, role: '', prevRole: draft.role })
              else { const nextRole = e.target.value; setDraft({ ...draft, role: nextRole, departmentHead: isHeadRole(draft.department, nextRole) ? (draft.id ? draft.departmentHead : true) : false }) }
            }}>
              <option value="" disabled>请选择岗位</option>
              {allRoleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="__new_role__">＋ 新增岗位…</option>
            </select>
          )}</label>
          <label>密码{draft.id ? '（留空则不修改）' : ''}<input minLength={8} autoComplete="new-password" type="password" value={draft.password ?? ''} onChange={e => setDraft({ ...draft, password: e.target.value })} placeholder={draft.id ? '留空保持原密码' : '默认 Vigor@2026'} /></label>
          <div className="org-modal-checks">
            <label><input type="checkbox" checked={draft.isAdmin} onChange={e => setDraft({ ...draft, isAdmin: e.target.checked })} /> 管理员</label>
            <label><input type="checkbox" checked={draft.departmentHead} disabled={!isHeadRole(draft.department, draft.role)} title={isHeadRole(draft.department, draft.role) ? '该岗位为该部门最高职位' : '仅该部门最高岗位（' + (headRoleOf(draft.department) ? (roles[headRoleOf(draft.department) as Role]?.label ?? headRoleOf(draft.department)) : '—') + '）可设为主管'} onChange={e => setDraft({ ...draft, departmentHead: e.target.checked })} /> 部门主管</label>
            <label><input type="checkbox" checked={draft.disabled} onChange={e => setDraft({ ...draft, disabled: e.target.checked })} /> 停用账号</label>
          </div>
          {draft.department && !isHeadRole(draft.department, draft.role) && <p className="org-modal-hint">部门主管需选择该部门最高岗位（{headRoleOf(draft.department) ? (roles[headRoleOf(draft.department) as Role]?.label ?? headRoleOf(draft.department)) : '—'}）后勾选。</p>}
        </div>
        <div className="org-modal-actions">
          <button type="submit" className="primary-button">{draft.id ? '保存账号变更' : '创建账号'}</button>
          <button type="button" onClick={() => setDraft(null)}>取消</button>
        </div>
      </form>
    </div>}
  </section>
}

function AppPermissionAdmin({ currentUser }: { currentUser: DemoUser }) {
  const [items, setItems] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const roleGroups = [
    { label: '经营管理', ids: ['general_manager', 'sales_vp', 'finance_vp'] },
    { label: '销售团队', ids: ['sales_manager', 'sales_team_lead', 'salesperson', 'project_coordinator'] },
    { label: '采购与质量', ids: ['procurement_manager', 'procurement_team_lead', 'purchaser', 'quality_team'] },
    { label: '财务与船务', ids: ['finance_manager', 'accountant', 'shipping_manager', 'shipping_operator'] },
    { label: '支持与行政', ids: ['sales_support', 'market_team', 'hr_director', 'admin_specialist'] },
  ]
  const allRoles = Object.keys(roles)
  const refresh = async () => { try { setItems(await getServerAppPermissions()) } catch { setMessage('无法读取应用权限，请重新登录后重试。') } }
  useEffect(() => { void refresh() }, [])
  const setRoles = (appId: string, nextRoles: string[]) => setItems(current => current.map(item => item.id === appId ? { ...item, roles: [...new Set(nextRoles)] } : item))
  const toggle = (appId: string, roleId: string, checked: boolean) => { const item = items.find(value => value.id === appId); if (item) setRoles(appId, checked ? [...item.roles, roleId] : item.roles.filter((role: string) => role !== roleId)) }
  const save = async (item: any) => { setSaving(item.id); try { await saveServerAppPermissions(item.id, item.roles); setMessage(`“${item.name}”的岗位授权已保存并立即生效。`); await refresh() } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败，请重试。') } finally { setSaving(null) } }
  if (!currentUser.isAdmin) return <section className="page"><div className="state-card"><h2>无管理权限</h2><p>仅管理员可配置应用岗位授权。</p></div></section>
  return <section className="page app-permission-page"><div className="page-heading"><h1>应用岗位权限</h1><p>选择可进入每个应用的岗位。保存后，左侧导航、工作台页面和应用入口会立即同步。</p></div><div className="permission-guidance"><span className="permission-guidance-mark">!</span><p><b>权限规则说明</b> 未勾选的岗位看不到该应用，也无法通过链接直接进入。应用内部的业务操作权限仍由各应用自己的规则控制。</p></div><div className="app-permission-list">{items.map((item, index) => <article className="app-permission-card" key={item.id}><header><div className="app-permission-index">{String(index + 1).padStart(2, '0')}</div><div><h2>{item.name}</h2><p>{item.entryPath}</p></div><div className="app-permission-summary"><b>{item.roles.length}</b><span>个岗位已授权</span></div></header><div className="app-permission-toolbar"><span>选择岗位</span><div><button type="button" onClick={() => setRoles(item.id, allRoles)}>全选</button><button type="button" onClick={() => setRoles(item.id, [])}>清空</button></div></div><div className="role-group-grid">{roleGroups.map(group => <section className="role-group" key={group.label}><h3>{group.label}</h3><div>{group.ids.map(roleId => <label key={roleId}><input type="checkbox" checked={item.roles.includes(roleId)} onChange={event => toggle(item.id, roleId, event.target.checked)} /><span>{roles[roleId as Role].label}</span></label>)}</div></section>)}</div><footer><span>{item.roles.length ? '已配置，可保存生效。' : '尚未授权任何岗位。'}</span><button className="primary-button" type="button" disabled={saving === item.id} onClick={() => void save(item)}>{saving === item.id ? '正在保存…' : '保存此应用授权'}</button></footer></article>)}</div>{message && <p className="permission-save-feedback" role="status">{message}</p>}</section>
}

export default function App() { return <Layout /> }
