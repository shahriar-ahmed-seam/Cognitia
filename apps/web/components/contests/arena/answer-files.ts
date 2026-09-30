"use client"

import { createContext, useContext } from "react"

/** API path of a contest answer photo; load it with useAuthImage. */
export const contestAnswerFileUrl = (id: string) => `/api/contests/answer-files/${id}`

/** API path of a practice answer photo. */
export const practiceAnswerFileUrl = (id: string) => `/api/practice/answer-files/${id}`

/**
 * Where answer photos are served from. Contests are the default; exam practice wraps its pages in
 * <AnswerFileUrlProvider value={practiceAnswerFileUrl}> so the shared answer components load from there.
 */
const AnswerFileUrlContext = createContext<(id: string) => string>(contestAnswerFileUrl)

export const AnswerFileUrlProvider = AnswerFileUrlContext.Provider
export const useAnswerFileUrl = () => useContext(AnswerFileUrlContext)
