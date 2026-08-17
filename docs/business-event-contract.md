# 工作台业务事件接口（内测）

所有应用运行在 CVM，统一通过工作台同域 BFF 调用：

`POST /api/events`

## 请求头

- `Content-Type: application/json`
- `X-Demo-Role: salesperson`（当前内测身份标识；正式身份接入后由服务端会话替代）

## 事件格式

```json
{
  "eventId": "app-name:business-id:event:version",
  "type": "todo.created | todo.completed | todo.overdue",
  "source": "AI 销售陪练",
  "todoId": "optional-stable-id",
  "title": "仅 todo.created 必填",
  "dueAt": "仅 todo.created 必填，ISO 8601",
  "priority": "仅 todo.created 必填：high | medium | normal"
}
```

- `eventId` 必须全局稳定。同一 eventId 可安全重试，不会重复创建待办。
- `todo.created` 自动创建未完成待办。
- `todo.completed` 仅能由实际业务操作完成后触发，自动关闭待办。
- `todo.overdue` 自动标记待办为关注项并提高优先级。
- 事件与待办状态均保留在 CVM 受限目录；不使用 CloudBase。
- 业务资料文件不随事件上传，资料文件后续统一存入 COS。
