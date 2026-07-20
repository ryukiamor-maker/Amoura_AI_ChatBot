import type { UIMessage } from 'ai'

import type {
  ChatLocale,
  ContactCardData,
  LocationCardData,
  ProfileCardData,
  ProjectCardData,
  TimelineCardData
} from './schema'

export type ChatbotTransitionPhase =
  | 'closed'
  | 'opening-mask'
  | 'opening-morph'
  | 'opening-controls'
  | 'opening-welcome'
  | 'open'
  | 'closing-controls'
  | 'closing-morph'

export type ChatTools = {
  showContact: {
    input: { reason: string }
    output: ContactCardData
  }
  showLocation: {
    input: { reason: string }
    output: LocationCardData
  }
  showProfile: {
    input: { reason: string }
    output: ProfileCardData
  }
  showProjects: {
    input: { reason: string; ids?: string[] }
    output: { projects: ProjectCardData[] }
  }
  showTimeline: {
    input: { reason: string }
    output: TimelineCardData
  }
}

export type ChatMessage = UIMessage<
  { createdAt: string },
  Record<string, never>,
  ChatTools
>

export type MockIntent = 'contact' | 'fallback' | 'location' | 'profile' | 'projects' | 'timeline'

export type MockToolPlan = {
  [Name in keyof ChatTools]: {
    input: ChatTools[Name]['input']
    name: Name
    output: ChatTools[Name]['output']
  }
}[keyof ChatTools]

export type MockResponsePlan = {
  intent: MockIntent
  text: string
  tool?: MockToolPlan
}

export type { ChatLocale }
