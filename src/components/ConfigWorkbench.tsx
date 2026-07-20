'use client'

import { Check, ChevronDown, Download, ExternalLink, Maximize2, Minus, Plus, Redo2, RotateCcw, Save, TestTube2, Undo2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ChatbotWidget, chatbotConfigSchema, migrateChatbotConfig, type ChatbotConfig, type ChatLocale } from '@/chatbot'
import { CardsEditor, KnowledgeEditor } from '@/components/FriendlyConfigEditors'

type SectionKey = 'runtime' | 'identity' | 'knowledge' | 'cards' | 'launcher' | 'appearance' | 'transfer'
type Notice = { kind: 'error' | 'success' | 'working'; text: string } | null

const sectionLabels: Record<SectionKey, Record<ChatLocale, string>> = {
  appearance: { en: 'Appearance', zh: '外观' },
  cards: { en: 'Cards', zh: '内容卡片' },
  identity: { en: 'Identity', zh: '助手身份' },
  knowledge: { en: 'Knowledge', zh: '知识内容' },
  launcher: { en: 'Launcher', zh: '启动按钮' },
  runtime: { en: 'Runtime', zh: '运行设置' },
  transfer: { en: 'Transfer', zh: '导入与导出' }
}

const copy = (locale: ChatLocale, en: string, zh: string) => locale === 'zh' ? zh : en

function clone<T>(value: T): T {
  return structuredClone(value)
}

function Field({ children, hint, label }: { children: ReactNode; hint?: string; label: string }) {
  return <label className="config-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>
}

function ImageSourceField({ label, locale, onChange, value }: { label: string; locale: ChatLocale; onChange: (value: string) => void; value: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  async function selectLocalImage(file?: File) {
    if (!file?.type.startsWith('image/') || file.size > 1_000_000) return
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <Field hint={copy(locale, 'Paste a public path or HTTPS URL, or choose a local image (up to 1 MB).', '可填写公共路径或 HTTPS 地址，也可选择本地图片（最大 1 MB）。')} label={label}>
      <div className="image-source-field">
        <button aria-label={copy(locale, 'Choose a local image', '选择本地图片')} className="image-source-field__preview" onClick={() => inputRef.current?.click()} type="button"><img alt="" src={value} /></button>
        <input value={value} onChange={(event) => onChange(event.target.value)} />
        <input accept="image/*" hidden onChange={(event) => void selectLocalImage(event.target.files?.[0])} ref={inputRef} type="file" />
      </div>
    </Field>
  )
}

function Section({ children, locale, name, onReset, open = false }: { children: ReactNode; locale: ChatLocale; name: SectionKey; onReset: () => void; open?: boolean }) {
  return (
    <details className="config-section" data-section={name} open={open}>
      <summary><span>{sectionLabels[name][locale]}</span><ChevronDown size={16} /></summary>
      <div className="config-section__body">{children}<button className="text-button" onClick={onReset} type="button"><RotateCcw size={13} />{copy(locale, 'Reset section', '恢复本区默认')}</button></div>
    </details>
  )
}

export function ConfigWorkbench({ apiKeyConfigured, initialConfig }: { apiKeyConfigured: boolean; initialConfig: ChatbotConfig }) {
  const defaults = useRef(clone(initialConfig))
  const [saved, setSaved] = useState(() => clone(initialConfig))
  const [draft, setDraft] = useState(() => clone(initialConfig))
  const [locale, setLocale] = useState<ChatLocale>('zh')
  const [notice, setNotice] = useState<Notice>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const previewConfig = useMemo(() => ({ ...draft, mode: 'mock' as const }), [draft])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(mutator: (next: ChatbotConfig) => void) {
    setDraft((current) => { const next = clone(current); mutator(next); return next })
    setNotice(null)
  }

  function resetSection(section: SectionKey) {
    const baseline = defaults.current
    update((next) => {
      if (section === 'runtime') { next.mode = baseline.mode; next.api = clone(baseline.api) }
      if (section === 'identity') { next.assistant = clone(baseline.assistant); next.defaultLocale = baseline.defaultLocale }
      if (section === 'knowledge') { next.profile = clone(baseline.profile); next.faq = clone(baseline.faq); next.rules = clone(baseline.rules); next.suggestions = clone(baseline.suggestions); next.evaluations = clone(baseline.evaluations) }
      if (section === 'cards') { next.projects = clone(baseline.projects); next.timeline = clone(baseline.timeline); next.contact = clone(baseline.contact); next.location = clone(baseline.location) }
      if (section === 'launcher') next.launcher = clone(baseline.launcher)
      if (section === 'appearance') next.appearance = clone(baseline.appearance)
      if (section === 'transfer') Object.assign(next, clone(baseline))
    })
  }

  async function save() {
    const parsed = chatbotConfigSchema.safeParse(draft)
    if (!parsed.success) { setNotice({ kind: 'error', text: parsed.error.issues[0]?.message || copy(locale, 'Configuration is invalid.', '配置内容有误。') }); return }
    setNotice({ kind: 'working', text: copy(locale, 'Saving…', '正在保存…') })
    try {
      const response = await fetch('/api/config', {
        body: JSON.stringify(parsed.data), headers: { 'Content-Type': 'application/json' }, method: 'PUT'
      })
      const body = await response.json() as { config?: ChatbotConfig; error?: string }
      if (!response.ok || !body.config) throw new Error(body.error || copy(locale, 'Save failed.', '保存失败。'))
      setDraft(clone(body.config)); setSaved(clone(body.config)); setNotice({ kind: 'success', text: copy(locale, 'Configuration saved.', '配置已保存。') })
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : copy(locale, 'Save failed.', '保存失败。') }) }
  }

  async function testConnection() {
    setNotice({ kind: 'working', text: copy(locale, 'Testing provider…', '正在测试接口…') })
    try {
      const response = await fetch('/api/config/test', { body: JSON.stringify({ api: draft.api }), headers: { 'Content-Type': 'application/json' }, method: 'POST' })
      const body = await response.json() as { error?: string; latencyMs?: number; ok?: boolean }
      if (!response.ok || !body.ok) throw new Error(body.error || copy(locale, 'Connection failed.', '连接失败。'))
      setNotice({ kind: 'success', text: copy(locale, `Provider replied in ${body.latencyMs} ms.`, `接口响应正常，耗时 ${body.latencyMs} 毫秒。`) })
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : copy(locale, 'Connection failed.', '连接失败。') }) }
  }

  function exportJson() {
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(draft, null, 2)}\n`], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'chatbot-config.json'; anchor.click(); URL.revokeObjectURL(url)
  }

  async function importJson(file?: File) {
    if (!file) return
    try {
      setDraft(migrateChatbotConfig(JSON.parse(await file.text())))
      setNotice({ kind: 'success', text: copy(locale, 'Imported into the draft. Save to make it official.', '已导入到编辑区，请点击保存后生效。') })
    } catch { setNotice({ kind: 'error', text: copy(locale, 'The selected file is not a valid versioned chatbot configuration.', '所选文件不是有效的 Chatbot 配置。') }) }
  }

  return (
    <>
    <main className="config-workbench" data-chatbot-host-content>
      <header className="config-topbar">
        <div className="config-topbar__actions">
          <span className={`dirty-indicator${dirty ? ' is-dirty' : ''}`}>{dirty ? copy(locale, 'Unsaved changes', '有未保存的更改') : copy(locale, 'All changes saved', '所有更改已保存')}</span>
          <Link className="topbar-link" href="/preview" target="_blank">{copy(locale, 'Preview page', '预览页面')} <ExternalLink size={13} /></Link>
          <button className="primary-button" disabled={!dirty || notice?.kind === 'working'} onClick={save} type="button"><Save size={14} />{copy(locale, 'Save configuration', '保存配置')}</button>
        </div>
      </header>

      <div className="config-layout">
        <section className="config-stage" data-chatbot-host-content>
          <div className="toolcraft-toolbar" aria-label={copy(locale, 'Preview toolbar', '预览工具栏')}>
            <button aria-label={copy(locale, 'Undo', '撤销')} disabled type="button"><Undo2 size={14} /></button>
            <button aria-label={copy(locale, 'Redo', '重做')} disabled type="button"><Redo2 size={14} /></button>
            <i />
            <button aria-label={copy(locale, 'Zoom out', '缩小')} type="button"><Minus size={14} /></button>
            <span>100%</span>
            <button aria-label={copy(locale, 'Zoom in', '放大')} type="button"><Plus size={14} /></button>
            <i />
            <button aria-label={copy(locale, 'Center preview', '居中预览')} type="button"><Maximize2 size={14} /></button>
          </div>
          <div className="config-stage__meta"><span>{copy(locale, 'Chatbot preview', 'Chatbot 预览')}</span><button onClick={() => setLocale((value) => value === 'en' ? 'zh' : 'en')} type="button">{locale === 'en' ? '中文' : 'EN'}</button></div>
          <div className="toolcraft-canvas" data-chatbot-drag-bounds />
        </section>

        <aside className="config-panel">
          <div className="config-panel__intro"><p>{copy(locale, 'Configuration', '配置')}</p><span>{copy(locale, 'Changes update the preview immediately. Save when you are ready.', '修改会立即显示在左侧预览中，确认后再保存。')}</span></div>

          <Section locale={locale} name="runtime" onReset={() => resetSection('runtime')} open>
            <Field label={copy(locale, 'Runtime mode', '运行模式')}><select value={draft.mode} onChange={(event) => update((next) => { next.mode = event.target.value as 'mock' | 'live' })}><option value="mock">Mock</option><option value="live">Live</option></select></Field>
            <Field label={copy(locale, 'Base URL', 'API 接口地址')}><input value={draft.api.baseURL} onChange={(event) => update((next) => { next.api.baseURL = event.target.value })} /></Field>
            <Field label={copy(locale, 'Model', '模型')}><input value={draft.api.model} onChange={(event) => update((next) => { next.api.model = event.target.value })} /></Field>
            <div className="key-status"><i className={apiKeyConfigured ? 'is-ready' : ''} /><span>{copy(locale, `Server key ${apiKeyConfigured ? 'configured' : 'missing'}`, `服务端密钥${apiKeyConfigured ? '已配置' : '未配置'}`)}</span><code>DEEPSEEK_API_KEY</code></div>
            <button className="secondary-button" onClick={testConnection} type="button"><TestTube2 size={14} />{copy(locale, 'Test connection', '测试连接')}</button>
          </Section>

          <Section locale={locale} name="identity" onReset={() => resetSection('identity')}>
            <Field label={copy(locale, 'Default language', '默认语言')}><select value={draft.defaultLocale} onChange={(event) => update((next) => { next.defaultLocale = event.target.value as ChatLocale })}><option value="en">English</option><option value="zh">简体中文</option></select></Field>
            <ImageSourceField label={copy(locale, 'Answer avatar', '回答头像')} locale={locale} value={draft.assistant.avatarUrl} onChange={(value) => update((next) => { next.assistant.avatarUrl = value })} />
            <Field label={copy(locale, 'Bot name · English', '助手名称 · English')}><input value={draft.assistant.name.en} onChange={(event) => update((next) => { next.assistant.name.en = event.target.value })} /></Field>
            <Field label={copy(locale, 'Bot name · 中文', '助手名称 · 中文')}><input value={draft.assistant.name.zh} onChange={(event) => update((next) => { next.assistant.name.zh = event.target.value })} /></Field>
            <Field label={copy(locale, 'Persona · English', '人设 · English')}><textarea rows={4} value={draft.assistant.persona.en} onChange={(event) => update((next) => { next.assistant.persona.en = event.target.value })} /></Field>
            <Field label={copy(locale, 'Persona · 中文', '人设 · 中文')}><textarea rows={4} value={draft.assistant.persona.zh} onChange={(event) => update((next) => { next.assistant.persona.zh = event.target.value })} /></Field>
          </Section>

          <Section locale={locale} name="knowledge" onReset={() => resetSection('knowledge')}>
            <KnowledgeEditor config={draft} locale={locale} update={update} />
          </Section>

          <Section locale={locale} name="cards" onReset={() => resetSection('cards')}>
            <CardsEditor config={draft} locale={locale} update={update} />
          </Section>

          <Section locale={locale} name="launcher" onReset={() => resetSection('launcher')}>
            <ImageSourceField label={copy(locale, 'Button icon', '按钮头像')} locale={locale} value={draft.launcher.iconUrl} onChange={(value) => update((next) => { next.launcher.iconUrl = value })} />
            <Field label={copy(locale, 'Label · English', '按钮文案 · English')}><input value={draft.launcher.label.en} onChange={(event) => update((next) => { next.launcher.label.en = event.target.value })} /></Field>
            <Field label={copy(locale, 'Label · 中文', '按钮文案 · 中文')}><input value={draft.launcher.label.zh} onChange={(event) => update((next) => { next.launcher.label.zh = event.target.value })} /></Field>
            <Field label={`${copy(locale, 'Appearance delay', '出现延迟')} · ${draft.appearance.launcherDelayMs} ms`}><input max="10000" min="0" step="50" type="range" value={draft.appearance.launcherDelayMs} onChange={(event) => update((next) => { next.appearance.launcherDelayMs = Number(event.target.value) })} /></Field>
            <Field label={copy(locale, 'Position', '初始位置')}><select value={draft.appearance.position} onChange={(event) => update((next) => { next.appearance.position = event.target.value as 'left' | 'center' | 'right' })}><option value="right">{copy(locale, 'Right', '右侧')}</option><option value="center">{copy(locale, 'Center', '居中')}</option><option value="left">{copy(locale, 'Left', '左侧')}</option></select></Field>
          </Section>

          <Section locale={locale} name="appearance" onReset={() => resetSection('appearance')}>
            {(['accent', 'surface', 'card'] as const).map((key) => <Field key={key} label={{ accent: copy(locale, 'Accent color', '强调色'), card: copy(locale, 'Card color', '卡片颜色'), surface: copy(locale, 'Surface color', '界面底色') }[key]}><div className="color-field"><input type="color" value={draft.appearance[key]} onChange={(event) => update((next) => { next.appearance[key] = event.target.value })} /><input value={draft.appearance[key]} onChange={(event) => update((next) => { next.appearance[key] = event.target.value })} /></div></Field>)}
            <Field label={copy(locale, 'Motion', '动效强度')}><select value={draft.appearance.motion} onChange={(event) => update((next) => { next.appearance.motion = event.target.value as ChatbotConfig['appearance']['motion'] })}><option value="full">{copy(locale, 'Full', '完整')}</option><option value="gentle">{copy(locale, 'Gentle', '柔和')}</option><option value="reduced">{copy(locale, 'Reduced', '精简')}</option></select></Field>
          </Section>

          <Section locale={locale} name="transfer" onReset={() => resetSection('transfer')}>
            <p className="config-note">{copy(locale, 'Import validates the configuration version and only replaces the current draft until you save.', '导入时会校验配置版本；在点击保存前，只会替换当前编辑内容。')}</p>
            <div className="transfer-actions">
              <button className="secondary-button" onClick={exportJson} type="button"><Download size={14} />{copy(locale, 'Export settings', '导出设置')}</button>
              <button className="secondary-button" onClick={() => inputRef.current?.click()} type="button"><Upload size={14} />{copy(locale, 'Import settings', '导入设置')}</button>
              <input accept="application/json" hidden onChange={(event) => void importJson(event.target.files?.[0])} ref={inputRef} type="file" />
              <button className="secondary-button" onClick={() => { setDraft(clone(defaults.current)); setNotice({ kind: 'success', text: copy(locale, 'Defaults restored to the draft.', '已恢复默认配置，请保存后生效。') }) }} type="button"><RotateCcw size={14} />{copy(locale, 'Restore all defaults', '恢复全部默认')}</button>
            </div>
          </Section>
          {notice ? <div className={`config-notice is-${notice.kind}`} role="status">{notice.kind === 'success' ? <Check size={14} /> : null}{notice.text}</div> : null}
        </aside>
      </div>
    </main>
    <ChatbotWidget config={previewConfig} locale={locale} overlayScope="host" />
    </>
  )
}
