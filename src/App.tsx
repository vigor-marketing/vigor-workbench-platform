import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { Icon } from './components/Icon'
import { appUrl, apps, canAccess, departments, initialTodos, roles, type AppDefinition, type Department, type Role, type Todo } from './data/workbench'
import './styles.css'

function Layout() {
  const [role, setRole] = useState<Role>('salesperson')
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const completeTodo = (id: string) => setTodos(items => items.map(item => item.id === id ? { ...item, completed: !item.completed } : item))

  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="返回工作台首页"><span className="brand-mark">V</span><span>Vigor<br /><small>WORKBENCH</small></span></Link>
      <nav className="primary-nav" aria-label="主导航">
        <NavLink end to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name="grid" />工作总览</NavLink>
        <NavLink to="/todos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name="check" />我的待办<span className="nav-count">{todos.filter(item => !item.completed).length}</span></NavLink>
      </nav>
      <div className="nav-caption">部门应用</div>
      <div className="department-nav">
        {(Object.keys(departments) as Department[]).map(department => <div className="department-item" key={department}>
          <div className="department-title"><span>{departments[department].order}</span>{departments[department].label}</div>
          {apps.filter(app => app.department === department).map(app => <NavLink key={app.id} to={`/apps/${app.id}`} className={({ isActive }) => `app-nav ${isActive ? 'active' : ''}`}><i>{app.shortName.slice(0, 1)}</i>{app.name}</NavLink>)}
        </div>)}
      </div>
      <div className="sidebar-bottom"><Link to="/settings" className="nav-item"><Icon name="settings" />接入设置</Link><p>平台版本 0.1<br />演示数据环境</p></div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <div className="crumb"><span>VIGOR</span><b>/</b><span>统一办公平台</span></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="搜索"><Icon name="search" /></button>
          <button className="icon-button notification" aria-label="通知"><Icon name="bell" /><i>2</i></button>
          <label className="role-switch"><span>演示角色</span><select value={role} onChange={event => setRole(event.target.value as Role)}>{Object.entries(roles).map(([value, info]) => <option value={value} key={value}>{info.label}</option>)}</select></label>
          <div className="avatar" title={roles[role].displayName}>{roles[role].displayName.slice(0, 1)}</div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Overview todos={todos} onToggle={completeTodo} role={role} />} />
        <Route path="/todos" element={<TodoPage todos={todos} onToggle={completeTodo} />} />
        <Route path="/apps/:appId" element={<ApplicationPage role={role} />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  </div>
}

function Overview({ todos, onToggle, role }: { todos: Todo[]; onToggle: (id: string) => void; role: Role }) {
  const pending = todos.filter(item => !item.completed)
  return <section className="page overview-page">
    <div className="page-title-row"><div><p className="eyebrow">08 / 07 / 2026 · 周五</p><h1>今天，先把关键事项推进。</h1><p className="subtle">当前为 <b>{roles[role].label}</b> 视图；真实权限将在身份服务接入后由服务端校验。</p></div><Link to="/todos" className="plain-action">查看全部待办 <Icon name="arrow" /></Link></div>
    <section className="signal-bar" aria-label="今日工作信号">
      <div><span className="signal-number">{pending.length}</span><span>待办事项</span></div><div><span className="signal-number">2</span><span>待审批</span></div><div className="risk"><span className="signal-number">1</span><span>需关注</span></div><div className="signal-note"><Icon name="clock" />最后更新于刚刚</div>
    </section>
    <div className="overview-grid">
      <section className="ledger-panel"><div className="panel-heading"><div><p className="eyebrow">ACTION QUEUE</p><h2>我的待办</h2></div><span className="today-tag">今日优先</span></div><TodoList todos={pending.slice(0, 4)} onToggle={onToggle} compact /><Link className="panel-footer" to="/todos">进入待办中心 <Icon name="arrow" /></Link></section>
      <section className="operating-panel"><div className="panel-heading"><div><p className="eyebrow">MODULE STATUS</p><h2>模块运行</h2></div><span className="live-dot">实时</span></div><div className="module-list">{apps.map((app, index) => <Link className="module-row" key={app.id} to={`/apps/${app.id}`}><span className="module-index">0{index + 1}</span><span className="module-name">{app.name}<small>{departments[app.department].label} · {app.description}</small></span><span className={`status ${app.state}`}>{app.state === 'ready' ? '待网关验证' : '待完成配置'}</span><Icon name="arrow" /></Link>)}</div></section>
    </div>
    <section className="apps-section"><div className="section-heading"><div><p className="eyebrow">APPLICATION DIRECTORY</p><h2>部门应用</h2></div><span>首批接入 3 个系统</span></div><div className="app-directory">{apps.map(app => <AppDirectoryItem key={app.id} app={app} role={role} />)}</div></section>
    <section className="platform-notice"><Icon name="shield" /><div><b>平台边界已设定</b><p>工作台统一入口、待办和权限上下文；业务数据仍由各应用负责。跨系统数据通过 API、事件与映射表接入，不允许直接写入其他模块数据库。</p></div><Link to="/settings">查看接入设置 <Icon name="arrow" /></Link></section>
  </section>
}

function TodoList({ todos, onToggle, compact = false }: { todos: Todo[]; onToggle: (id: string) => void; compact?: boolean }) {
  if (!todos.length) return <div className="empty-list"><Icon name="check" size={22} /><p>所有待办已处理。</p></div>
  return <div className={`todo-list ${compact ? 'compact' : ''}`}>{todos.map((todo, index) => <article className={`todo-row ${todo.completed ? 'done' : ''}`} key={todo.id}><button onClick={() => onToggle(todo.id)} className="todo-check" aria-label={`标记“${todo.title}”已完成`}><Icon name="check" size={15} /></button><span className="todo-index">{String(index + 1).padStart(2, '0')}</span><div className="todo-copy"><h3>{todo.title}</h3><span>{todo.source}</span></div><time className={`priority ${todo.priority}`}>{todo.due}</time></article>)}</div>
}

function TodoPage({ todos, onToggle }: { todos: Todo[]; onToggle: (id: string) => void }) {
  const active = todos.filter(todo => !todo.completed)
  const completed = todos.filter(todo => todo.completed)
  return <section className="page todo-page"><div className="page-title-row"><div><p className="eyebrow">PERSONAL ACTION CENTER</p><h1>待办中心</h1><p className="subtle">未来这里会汇总审批、跨部门计划、项目节点和模块提醒。</p></div><button className="primary-button">新建协同计划 <Icon name="arrow" /></button></div><section className="wide-ledger"><div className="panel-heading"><div><p className="eyebrow">OPEN ITEMS</p><h2>{active.length} 项待处理</h2></div><span className="today-tag">实时更新</span></div><TodoList todos={active} onToggle={onToggle} /></section>{completed.length > 0 && <section className="wide-ledger completed"><div className="panel-heading"><h2>已完成</h2></div><TodoList todos={completed} onToggle={onToggle} /></section>}</section>
}

function AppDirectoryItem({ app, role }: { app: AppDefinition; role: Role }) {
  const permitted = canAccess(role, app)
  return <article className="directory-item"><div className="directory-order">{departments[app.department].order}</div><div className="directory-content"><p>{departments[app.department].label}</p><h3>{app.name}</h3><span>{app.description}</span></div><div className="directory-actions">{permitted ? <Link to={`/apps/${app.id}`}>打开模块 <Icon name="arrow" /></Link> : <span className="locked"><Icon name="lock" size={14} />当前角色无权访问</span>}</div></article>
}

function ApplicationPage({ role }: { role: Role }) {
  const { appId } = useParams()
  const app = apps.find(item => item.id === appId)
  const url = app ? appUrl(app) : undefined
  if (!app) return <NotFound />
  const permitted = canAccess(role, app)
  return <section className="page application-page"><div className="page-title-row"><div><p className="eyebrow">{departments[app.department].order} · {departments[app.department].label.toUpperCase()} / 已接入应用</p><h1>{app.name}</h1><p className="subtle">{app.description}</p></div><Link to="/" className="plain-action">返回工作总览 <Icon name="arrow" /></Link></div><div className="module-meta"><span><Icon name="shield" size={15} />访问范围：{roles[role].scope}</span><span><Icon name="clock" size={15} />平台仅传递身份与上下文</span></div>{!permitted ? <PermissionState app={app} /> : url ? <EmbeddedApp app={app} url={url} /> : <ConfigurationState app={app} />}</section>
}

function EmbeddedApp({ app, url }: { app: AppDefinition; url: string }) {
  const [failed, setFailed] = useState(false)
  return <section className="embed-wrap"><div className="embed-toolbar"><span><i className="live-dot" />已配置嵌入地址</span><a href={url} target="_blank" rel="noreferrer">在新页面打开 <Icon name="external" size={16} /></a></div>{failed ? <div className="state-card"><Icon name="alert" size={26} /><h2>模块暂时无法载入</h2><p>请检查同域 Nginx 路由、模块健康检查以及嵌入响应头配置。</p><Link to="/settings">查看接入设置</Link></div> : <iframe title={app.name} src={url} referrerPolicy="strict-origin" onError={() => setFailed(true)} />}</section>
}

function ConfigurationState({ app }: { app: AppDefinition }) {
  return <section className="state-card configuration"><span className="state-number">{departments[app.department].order}</span><Icon name="settings" size={28} /><h2>等待网关地址配置</h2><p>在平台根目录的 <code>.env</code> 配置 <code>{app.urlEnv}</code>，并由 Nginx 将该地址代理到已部署的 {app.name}。不要使用 GitHub 或第三方站点地址嵌入。</p><div className="state-actions"><Link to="/settings" className="primary-button">查看接入说明 <Icon name="arrow" /></Link></div></section>
}

function PermissionState({ app }: { app: AppDefinition }) {
  return <section className="state-card permission"><Icon name="lock" size={28} /><h2>当前演示角色没有访问权限</h2><p>{app.name} 仅开放给：{app.access.map(role => roles[role].label).join('、')}。接入 Keycloak 与平台 BFF 后，必须由服务端执行该权限规则。</p></section>
}

function SettingsPage() {
  return <section className="page settings-page"><div className="page-title-row"><div><p className="eyebrow">INTEGRATION CONTROL</p><h1>接入设置</h1><p className="subtle">这里列出首批应用的接入契约。当前为只读说明页。</p></div></div><section className="settings-ledger">{apps.map(app => <div className="setting-row" key={app.id}><div><span className="setting-key">{app.urlEnv}</span><h2>{app.name}</h2><p>部署后通过 <code>/apps/{app.id}/</code> 同域反向代理；平台禁止直接读写该应用数据库。</p></div><span className="status ready">需要配置</span></div>)}</section><section className="platform-notice"><Icon name="alert" /><div><b>生产环境前置条件</b><p>合并三个应用的接入改造 PR、部署统一网关、配置 OIDC 单点登录、建立平台 API 审计与事件同步后，再对内开放真实入口。</p></div></section></section>
}

function NotFound() { return <section className="page"><div className="state-card"><Icon name="alert" size={28} /><h2>页面不存在</h2><p>请选择左侧工作模块，或返回总览。</p><Link to="/" className="primary-button">返回工作总览 <Icon name="arrow" /></Link></div></section> }

export default function App() { return <Layout /> }
