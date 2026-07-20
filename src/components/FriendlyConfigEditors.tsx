'use client'

import { ChevronDown, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import type { ChatbotConfig, ChatLocale } from '@/chatbot'

type UpdateConfig = (mutator: (next: ChatbotConfig) => void) => void
type LocalizedText = { en: string; zh: string }
type LocalizedList = { en: string[]; zh: string[] }

const copy = (locale: ChatLocale, en: string, zh: string) => locale === 'zh' ? zh : en
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="config-field"><span>{label}</span>{children}</label>
}

function SuggestionIconUpload({ locale, onChange, value }: { locale: ChatLocale; onChange: (value: string | undefined) => void; value?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  function selectFile(file?: File) {
    if (!file?.type.startsWith('image/') || file.size > 1_000_000) return
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <Field label={copy(locale, 'Custom icon', '自定义图标')}>
      <div className="friendly-icon-upload">
        <button aria-label={copy(locale, 'Choose custom icon', '选择自定义图标')} className="friendly-icon-upload__preview" onClick={() => inputRef.current?.click()} type="button">{value ? <img alt="" src={value} /> : <Upload size={13} />}</button>
        <button onClick={() => inputRef.current?.click()} type="button">{value ? copy(locale, 'Replace image', '替换图片') : copy(locale, 'Choose image', '选择图片')}</button>
        <input accept="image/*" hidden onChange={(event) => selectFile(event.target.files?.[0])} ref={inputRef} type="file" />
      </div>
    </Field>
  )
}

function LocalizedFields({ label, multiline = false, onChange, value }: {
  label: string
  multiline?: boolean
  onChange: (locale: ChatLocale, value: string) => void
  value: LocalizedText
}) {
  const Control = multiline ? 'textarea' : 'input'
  return (
    <div className="friendly-localized">
      <Field label={`${label} · English`}><Control rows={multiline ? 3 : undefined} value={value.en} onChange={(event) => onChange('en', event.target.value)} /></Field>
      <Field label={`${label} · 中文`}><Control rows={multiline ? 3 : undefined} value={value.zh} onChange={(event) => onChange('zh', event.target.value)} /></Field>
    </div>
  )
}

function LocalizedListFields({ label, onChange, value, uiLocale }: {
  label: string
  onChange: (locale: ChatLocale, value: string[]) => void
  uiLocale: ChatLocale
  value: LocalizedList
}) {
  return (
    <div className="friendly-localized">
      {(['en', 'zh'] as const).map((locale) => (
        <Field key={locale} label={`${label} · ${locale === 'en' ? 'English' : '中文'}`}>
          <input
            placeholder={copy(uiLocale, 'Separate items with commas', '使用逗号分隔多个项目')}
            value={value[locale].join(', ')}
            onChange={(event) => onChange(locale, event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean))}
          />
        </Field>
      ))}
    </div>
  )
}

function FriendlyGroup({ children, count, open = false, title }: { children: ReactNode; count?: number; open?: boolean; title: string }) {
  return (
    <details className="friendly-group" open={open}>
      <summary><span>{title}{typeof count === 'number' ? <small>{count}</small> : null}</span><ChevronDown size={14} /></summary>
      <div className="friendly-group__body">{children}</div>
    </details>
  )
}

function ItemCard({ children, onRemove, removeLabel, title }: { children: ReactNode; onRemove?: () => void; removeLabel: string; title: string }) {
  return (
    <article className="friendly-item">
      <header><strong>{title}</strong>{onRemove ? <button aria-label={removeLabel} onClick={onRemove} type="button"><Trash2 size={13} /></button> : null}</header>
      <div>{children}</div>
    </article>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="friendly-add" onClick={onClick} type="button"><Plus size={13} />{label}</button>
}

export function KnowledgeEditor({ config, locale, update }: { config: ChatbotConfig; locale: ChatLocale; update: UpdateConfig }) {
  return (
    <div className="friendly-editor">
      <FriendlyGroup open title={copy(locale, 'Profile', '个人资料')}>
        <LocalizedFields label={copy(locale, 'Name', '名称')} value={config.profile.name} onChange={(language, value) => update((next) => { next.profile.name[language] = value })} />
        <LocalizedFields label={copy(locale, 'Role', '角色定位')} value={config.profile.role} onChange={(language, value) => update((next) => { next.profile.role[language] = value })} />
        <LocalizedFields multiline label={copy(locale, 'Summary', '简介')} value={config.profile.summary} onChange={(language, value) => update((next) => { next.profile.summary[language] = value })} />
        <LocalizedListFields label={copy(locale, 'Skills', '技能')} uiLocale={locale} value={config.profile.skills} onChange={(language, value) => update((next) => { next.profile.skills[language] = value })} />
        <Field label={copy(locale, 'Profile link', '资料链接')}><input value={config.profile.href} onChange={(event) => update((next) => { next.profile.href = event.target.value })} /></Field>
      </FriendlyGroup>

      <FriendlyGroup count={config.faq.length} title={copy(locale, 'Frequently asked questions', '常见问题')}>
        {config.faq.map((item, index) => (
          <ItemCard key={item.id} title={`${copy(locale, 'Question', '问题')} ${index + 1}`} removeLabel={copy(locale, 'Remove question', '删除问题')} onRemove={() => update((next) => { next.faq.splice(index, 1) })}>
            <LocalizedFields label={copy(locale, 'Question', '问题')} value={item.question} onChange={(language, value) => update((next) => { next.faq[index].question[language] = value })} />
            <LocalizedFields multiline label={copy(locale, 'Answer', '回答')} value={item.answer} onChange={(language, value) => update((next) => { next.faq[index].answer[language] = value })} />
          </ItemCard>
        ))}
        <AddButton label={copy(locale, 'Add question', '添加问题')} onClick={() => update((next) => { next.faq.push({ id: newId('faq'), question: { en: 'New question', zh: '新问题' }, answer: { en: 'New answer', zh: '新回答' } }) })} />
      </FriendlyGroup>

      <FriendlyGroup count={config.rules.length} title={copy(locale, 'Answer rules', '回答规则')}>
        {config.rules.map((rule, index) => (
          <ItemCard key={index} title={`${copy(locale, 'Rule', '规则')} ${index + 1}`} removeLabel={copy(locale, 'Remove rule', '删除规则')} onRemove={() => update((next) => { next.rules.splice(index, 1) })}>
            <LocalizedFields multiline label={copy(locale, 'Instruction', '规则内容')} value={rule} onChange={(language, value) => update((next) => { next.rules[index][language] = value })} />
          </ItemCard>
        ))}
        <AddButton label={copy(locale, 'Add rule', '添加规则')} onClick={() => update((next) => { next.rules.push({ en: 'New answer rule.', zh: '新的回答规则。' }) })} />
      </FriendlyGroup>

      <FriendlyGroup count={config.suggestions.length} title={copy(locale, 'Suggested questions', '建议问题')}>
        {config.suggestions.map((item, index) => (
          <ItemCard key={item.id} title={`${copy(locale, 'Shortcut', '快捷按钮')} ${index + 1}`} removeLabel={copy(locale, 'Remove shortcut', '删除快捷按钮')} onRemove={() => update((next) => { next.suggestions.splice(index, 1) })}>
            <div className="friendly-inline">
              <Field label={copy(locale, 'Icon', '图标')}><span className="friendly-icon-picker">{item.icon === 'none' ? <i aria-hidden="true" /> : <img alt="" src={item.icon === 'custom' ? item.iconUrl || '/assets/chatbot/icons/ai.svg' : `/assets/chatbot/icons/${item.icon}.svg`} />}<select value={item.icon} onChange={(event) => update((next) => { next.suggestions[index].icon = event.target.value as typeof item.icon })}><option value="work">{copy(locale, 'Work', '作品')}</option><option value="ai">AI</option><option value="background">{copy(locale, 'Background', '经历')}</option><option value="contact">{copy(locale, 'Contact', '联系')}</option><option value="location">{copy(locale, 'Location', '地点')}</option><option value="custom">{copy(locale, 'Custom icon', '自定义图标')}</option><option value="none">{copy(locale, 'No icon', '不显示图标')}</option></select></span></Field>
              <Field label={copy(locale, 'Card after answer', '回答后显示卡片')}><select value={item.card} onChange={(event) => update((next) => { next.suggestions[index].card = event.target.value as typeof item.card })}><option value="none">{copy(locale, 'Text only', '仅显示文字')}</option><option value="projects">{copy(locale, 'Projects', '项目卡片')}</option><option value="profile">{copy(locale, 'Profile', '资料卡片')}</option><option value="timeline">{copy(locale, 'Timeline', '时间线卡片')}</option><option value="contact">{copy(locale, 'Contact', '联系卡片')}</option><option value="location">{copy(locale, 'Location', '地点卡片')}</option></select></Field>
            </div>
            {item.icon === 'custom' ? <SuggestionIconUpload locale={locale} onChange={(value) => update((next) => { next.suggestions[index].iconUrl = value })} value={item.iconUrl} /> : null}
            <LocalizedFields label={copy(locale, 'Button label', '按钮文案')} value={item.label} onChange={(language, value) => update((next) => { next.suggestions[index].label[language] = value })} />
            <LocalizedFields multiline label={copy(locale, 'Question sent', '点击后发送的问题')} value={item.prompt} onChange={(language, value) => update((next) => { next.suggestions[index].prompt[language] = value })} />
            <LocalizedFields multiline label={copy(locale, 'Displayed answer', '显示的回答内容')} value={item.response} onChange={(language, value) => update((next) => { next.suggestions[index].response[language] = value })} />
          </ItemCard>
        ))}
        {config.suggestions.length < 8 ? <AddButton label={copy(locale, 'Add shortcut', '添加快捷按钮')} onClick={() => update((next) => { next.suggestions.push({ card: 'none', icon: 'ai', id: newId('suggestion'), label: { en: 'New', zh: '新增' }, prompt: { en: 'Tell me more', zh: '请介绍更多' }, response: { en: 'This is a configured text response.', zh: '这是一段配置好的文字回答。' } }) })} /> : null}
      </FriendlyGroup>

      <FriendlyGroup count={config.evaluations.length} title={copy(locale, 'Evaluation prompts', '评测问题')}>
        {config.evaluations.map((item, index) => (
          <ItemCard key={item.id} title={`${copy(locale, 'Test', '测试')} ${index + 1}`} removeLabel={copy(locale, 'Remove test', '删除测试')} onRemove={config.evaluations.length > 5 ? () => update((next) => { next.evaluations.splice(index, 1) }) : undefined}>
            <LocalizedFields label={copy(locale, 'Prompt', '测试问题')} value={item.prompt} onChange={(language, value) => update((next) => { next.evaluations[index].prompt[language] = value })} />
            <Field label={copy(locale, 'Expected result', '预期结果')}><select value={item.expectedIntent} onChange={(event) => update((next) => { next.evaluations[index].expectedIntent = event.target.value as typeof item.expectedIntent })}>{['projects', 'profile', 'timeline', 'contact', 'location', 'fallback'].map((intent) => <option key={intent} value={intent}>{intent}</option>)}</select></Field>
          </ItemCard>
        ))}
        {config.evaluations.length < 60 ? <AddButton label={copy(locale, 'Add test', '添加测试')} onClick={() => update((next) => { next.evaluations.push({ expectedIntent: 'fallback', id: newId('eval'), prompt: { en: 'New test prompt', zh: '新的测试问题' } }) })} /> : null}
      </FriendlyGroup>
    </div>
  )
}

export function CardsEditor({ config, locale, update }: { config: ChatbotConfig; locale: ChatLocale; update: UpdateConfig }) {
  return (
    <div className="friendly-editor">
      <FriendlyGroup count={config.projects.length} open title={copy(locale, 'Project cards', '项目卡片')}>
        {config.projects.map((project, index) => (
          <ItemCard key={project.id} title={project.title[locale] || `${copy(locale, 'Project', '项目')} ${index + 1}`} removeLabel={copy(locale, 'Remove project', '删除项目')} onRemove={config.projects.length > 1 ? () => update((next) => { next.projects.splice(index, 1) }) : undefined}>
            <LocalizedFields label={copy(locale, 'Title', '标题')} value={project.title} onChange={(language, value) => update((next) => { next.projects[index].title[language] = value })} />
            <LocalizedFields label={copy(locale, 'Role', '角色')} value={project.role} onChange={(language, value) => update((next) => { next.projects[index].role[language] = value })} />
            <LocalizedFields multiline label={copy(locale, 'Summary', '简介')} value={project.summary} onChange={(language, value) => update((next) => { next.projects[index].summary[language] = value })} />
            <LocalizedListFields label={copy(locale, 'Tags', '标签')} uiLocale={locale} value={project.tags} onChange={(language, value) => update((next) => { next.projects[index].tags[language] = value })} />
            <div className="friendly-inline"><Field label={copy(locale, 'Year', '年份')}><input type="number" value={project.year} onChange={(event) => update((next) => { next.projects[index].year = Number(event.target.value) })} /></Field><Field label={copy(locale, 'Accent', '强调色')}><input type="color" value={project.cover.accent} onChange={(event) => update((next) => { next.projects[index].cover.accent = event.target.value })} /></Field></div>
            <Field label={copy(locale, 'Link', '链接')}><input value={project.href} onChange={(event) => update((next) => { next.projects[index].href = event.target.value })} /></Field>
          </ItemCard>
        ))}
        {config.projects.length < 12 ? <AddButton label={copy(locale, 'Add project', '添加项目')} onClick={() => update((next) => { const id = newId('project'); next.projects.push({ cover: { accent: '#5271FF', eyebrow: { en: 'New project', zh: '新项目' } }, href: `/preview#${id}`, id, role: { en: 'Design role', zh: '设计角色' }, summary: { en: 'Project summary', zh: '项目简介' }, tags: { en: ['Prototype'], zh: ['原型'] }, title: { en: 'New project', zh: '新项目' }, year: new Date().getFullYear() }) })} /> : null}
      </FriendlyGroup>

      <FriendlyGroup count={config.timeline.items.length} title={copy(locale, 'Timeline card', '时间线卡片')}>
        <LocalizedFields label={copy(locale, 'Card title', '卡片标题')} value={config.timeline.title} onChange={(language, value) => update((next) => { next.timeline.title[language] = value })} />
        <Field label={copy(locale, 'More link', '更多链接')}><input value={config.timeline.href} onChange={(event) => update((next) => { next.timeline.href = event.target.value })} /></Field>
        {config.timeline.items.map((item, index) => <ItemCard key={`${item.date}-${index}`} title={`${copy(locale, 'Entry', '经历')} ${index + 1}`} removeLabel={copy(locale, 'Remove entry', '删除经历')} onRemove={config.timeline.items.length > 1 ? () => update((next) => { next.timeline.items.splice(index, 1) }) : undefined}><Field label={copy(locale, 'Date', '日期')}><input value={item.date} onChange={(event) => update((next) => { next.timeline.items[index].date = event.target.value })} /></Field><LocalizedFields label={copy(locale, 'Title', '标题')} value={item.title} onChange={(language, value) => update((next) => { next.timeline.items[index].title[language] = value })} /><LocalizedFields label={copy(locale, 'Detail', '详情')} value={item.detail} onChange={(language, value) => update((next) => { next.timeline.items[index].detail[language] = value })} /></ItemCard>)}
        {config.timeline.items.length < 8 ? <AddButton label={copy(locale, 'Add timeline entry', '添加经历')} onClick={() => update((next) => { next.timeline.items.push({ date: String(new Date().getFullYear()), title: { en: 'New milestone', zh: '新经历' }, detail: { en: 'Description', zh: '经历描述' } }) })} /> : null}
      </FriendlyGroup>

      <FriendlyGroup title={copy(locale, 'Contact card', '联系卡片')}>
        <LocalizedFields label={copy(locale, 'Title', '标题')} value={config.contact.title} onChange={(language, value) => update((next) => { next.contact.title[language] = value })} />
        <LocalizedFields multiline label={copy(locale, 'Note', '说明')} value={config.contact.note} onChange={(language, value) => update((next) => { next.contact.note[language] = value })} />
        <Field label={copy(locale, 'Email', '邮箱')}><input type="email" value={config.contact.email} onChange={(event) => update((next) => { next.contact.email = event.target.value })} /></Field>
        <Field label={copy(locale, 'Link', '链接')}><input value={config.contact.href} onChange={(event) => update((next) => { next.contact.href = event.target.value })} /></Field>
      </FriendlyGroup>

      <FriendlyGroup title={copy(locale, 'Location card', '地点卡片')}>
        <LocalizedFields label={copy(locale, 'City', '城市')} value={config.location.city} onChange={(language, value) => update((next) => { next.location.city[language] = value })} />
        <LocalizedFields label={copy(locale, 'Country', '国家或地区')} value={config.location.country} onChange={(language, value) => update((next) => { next.location.country[language] = value })} />
        <LocalizedFields multiline label={copy(locale, 'Note', '说明')} value={config.location.note} onChange={(language, value) => update((next) => { next.location.note[language] = value })} />
        <div className="friendly-inline"><Field label={copy(locale, 'Time zone', '时区')}><input value={config.location.timezone} onChange={(event) => update((next) => { next.location.timezone = event.target.value })} /></Field><Field label={copy(locale, 'Map link', '地图链接')}><input value={config.location.mapUrl} onChange={(event) => update((next) => { next.location.mapUrl = event.target.value })} /></Field></div>
      </FriendlyGroup>
    </div>
  )
}
