import { Injectable } from '@nestjs/common'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'

export type ServiceInput = { name?: string; endpoint?: string; enabled?: boolean; apiKey?: string }
export type GrantsInput = { serviceIds?: string[] }
type Service = { name: string; endpoint: string; enabled: boolean; apiKey?: string; updatedAt: string }
type Registry = { version: 2; services: Record<string, Service>; grants: Record<string, string[]> }
const mask=(value?:string)=>!value?null:value.length<=8?'••••••••':value.slice(0,4)+'••••••••'+value.slice(-4)

@Injectable()
export class IntegrationsService {
 private cache:Registry|null=null
 private async load():Promise<Registry>{
  if(this.cache)return this.cache
  try{const raw=JSON.parse(await readFile(config.integrationFile,'utf8'));this.cache=raw.version===2?raw:{version:2,services:Object.fromEntries(Object.entries(raw).map(([id,value]:any)=>[id,{name:id,endpoint:value.endpoint||'',enabled:value.enabled===true,apiKey:value.apiKey,updatedAt:value.updatedAt||new Date().toISOString()}])),grants:{}}}catch{this.cache={version:2,services:{},grants:{}}}
  return this.cache!
 }
 private async persist(){const data=await this.load();await mkdir(dirname(config.integrationFile),{recursive:true});await writeFile(config.integrationFile,JSON.stringify(data,null,2),{encoding:'utf8',mode:0o600})}
 async list(){const r=await this.load();return Object.entries(r.services).map(([id,s])=>({id,name:s.name,endpoint:s.endpoint,enabled:s.enabled,apiKeyConfigured:Boolean(s.apiKey),apiKeyMasked:mask(s.apiKey),updatedAt:s.updatedAt}))}
 async saveService(id:string,input:ServiceInput){if(!/^[a-z0-9-]+$/.test(id))throw new Error('API 服务标识不合法');const r=await this.load(),old=r.services[id];const endpoint=old?.endpoint??'';r.services[id]={name:input.name?.trim()||old?.name||id,endpoint,enabled:input.enabled??old?.enabled??false,apiKey:input.apiKey?.trim()||old?.apiKey,updatedAt:new Date().toISOString()};await this.persist();return this.list()}
 async removeService(id:string){const r=await this.load();if(!r.services[id])throw new Error('API 服务不存在');delete r.services[id];for(const appId of Object.keys(r.grants)){r.grants[appId]=r.grants[appId].filter(serviceId=>serviceId!==id)}await this.persist();return this.list()}
 async grants(appId:string){const r=await this.load();return {appId,serviceIds:r.grants[appId]||[]}}
 async saveGrants(appId:string,input:GrantsInput){if(!/^[a-z0-9-]+$/.test(appId))throw new Error('应用标识不合法');const r=await this.load();const ids=[...new Set((input.serviceIds||[]).filter(id=>Boolean(r.services[id])))];r.grants[appId]=ids;await this.persist();return this.grants(appId)}
 async authorizedForApp(appId:string){const r=await this.load(),ids=r.grants[appId]||[];return ids.map(id=>r.services[id]&&({id,name:r.services[id].name,endpoint:r.services[id].endpoint,enabled:r.services[id].enabled})).filter(Boolean)}
  async proxyChatCompletion(appId:string, body:unknown){
    const r=await this.load(), service=r.services.ai
    if(!service || !service.enabled || !(r.grants[appId]||[]).includes('ai')) throw new Error('当前应用未获 AI 服务授权。')
    if(!service.apiKey) throw new Error('AI 服务尚未配置密钥。')
    if(!body || typeof body!=='object') throw new Error('AI 请求格式不正确。')
    const payload=body as Record<string,unknown>
    if(typeof payload.model!=='string' || !Array.isArray(payload.messages)) throw new Error('AI 请求需要 model 与 messages。')
    const base=(service.endpoint || 'https://api.deepseek.com').replace(/\/+$/, '')
    let response:Response
    try {
      response=await fetch(base + '/chat/completions', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ' + service.apiKey},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)})
    } catch { throw new Error('AI 服务暂时无法连接。') }
    const text=await response.text()
    let result:unknown
    try { result=JSON.parse(text) } catch { result={error:{message:'AI 服务返回了无法识别的响应。'}} }
    return {status:response.status, body:result}
  }

}
