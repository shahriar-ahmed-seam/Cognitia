"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  BookmarkPlus,
  CheckCircle2,
  Send,
  MessageSquare,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Heart,
  MoreHorizontal,
  ArrowLeft,
  Star,
  Award,
  Zap,
} from "lucide-react"
import { QUESTIONS, ANSWERS, formatRelativeTime, CURRENT_USER, incrementViewCount } from "@/lib/mock-data"
import { vote, getVoteCount, getUserVote } from "@/lib/voting-data"
import { saveQuestion, isItemSaved, unsaveItem } from "@/lib/saved-items-data"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"

export default function QuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [newAnswer, setNewAnswer] = useState("")
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<
    Array<{
      id: string
      authorId: string
      content: string
      createdAt: Date
      author: any
      likes: number
      userLiked: boolean
      replies: Array<{
        id: string
        authorId: string
        content: string
        createdAt: Date
        author: any
        likes: number
        userLiked: boolean
      }>
      showReplies: boolean
      replyText: string
    }>
  >([])
  const [questionVotes, setQuestionVotes] = useState({})
  const [answerVotes, setAnswerVotes] = useState({})
  const [savedItems, setSavedItems] = useState({})
  const [answers, setAnswers] = useState([])
  const commentsRef = useRef<HTMLDivElement>(null)

  // Find the question by ID (in a real app, you'd fetch this from an API)
  const question = QUESTIONS.find((q) => q.id === params.id) || QUESTIONS[0]

  // Initialize answers
  useEffect(() => {
    // Get answers for this question
    const questionAnswers = ANSWERS.filter((a) => a.questionId === question.id)
    setAnswers(questionAnswers)
  }, [question.id])

  // Increment view count when the page loads
  useEffect(() => {
    incrementViewCount(params.id)
  }, [params.id])

  // Scroll to comments section if URL has #comments
  useEffect(() => {
    if (window.location.hash === "#comments" && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const handleVote = (itemId: string, itemType: "question" | "answer", voteType: "up" | "down") => {
    vote(CURRENT_USER.id, itemId, itemType, voteType)

    if (itemType === "question") {
      setQuestionVotes({
        ...questionVotes,
        [itemId]: getVoteCount(itemId),
      })

      toast({
        title: voteType === "up" ? "Upvoted" : "Downvoted",
        description: `You've ${voteType === "up" ? "upvoted" : "downvoted"} this question`,
      })
    } else {
      setAnswerVotes({
        ...answerVotes,
        [itemId]: getVoteCount(itemId),
      })

      toast({
        title: voteType === "up" ? "Upvoted" : "Downvoted",
        description: `You've ${voteType === "up" ? "upvoted" : "downvoted"} this answer`,
      })
    }
  }

  const handleSaveItem = (itemId: string) => {
    const isSaved = isItemSaved(CURRENT_USER.id, itemId)

    if (isSaved) {
      unsaveItem(CURRENT_USER.id, itemId)
      setSavedItems({
        ...savedItems,
        [itemId]: false,
      })
      toast({
        title: "Unsaved",
        description: "Item removed from your saved items",
      })
    } else {
      saveQuestion(CURRENT_USER.id, itemId)
      setSavedItems({
        ...savedItems,
        [itemId]: true,
      })
      toast({
        title: "Saved",
        description: "Item added to your saved items",
      })
    }
  }

  const handleCopyLink = (itemId: string) => {
    // Create a URL for the question
    const url = `${window.location.origin}/question/${itemId}`

    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Link copied to clipboard",
      })
    })
  }

  const handleShareToSocial = (platform: string, itemId: string, title: string) => {
    const url = `${window.location.origin}/question/${itemId}`
    let shareUrl = ""

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        break
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      default:
        return
    }

    window.open(shareUrl, "_blank", "width=600,height=400")
  }

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnswer.trim()) return

    // Create a new answer object
    const newAnswerObj = {
      id: Math.random().toString(36).substring(2, 15),
      questionId: question.id,
      authorId: CURRENT_USER.id,
      author: CURRENT_USER,
      content: newAnswer,
      isAccepted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      voteCount: 0,
    }

    // Add the new answer to the list
    setAnswers([...answers, newAnswerObj])

    // Clear the input
    setNewAnswer("")

    toast({
      title: "Answer submitted",
      description: "Your answer has been posted successfully",
    })
  }

  const handleAcceptAnswer = (answerId: string) => {
    setAnswers(
      answers.map((answer) => ({
        ...answer,
        isAccepted: answer.id === answerId,
      })),
    )

    toast({
      title: "Answer accepted",
      description: "You've marked this answer as accepted",
    })
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    // Create a new comment object
    const newCommentObj = {
      id: Math.random().toString(36).substring(2, 15),
      authorId: CURRENT_USER.id,
      content: newComment,
      createdAt: new Date(),
      author: CURRENT_USER,
      likes: 0,
      userLiked: false,
      replies: [],
      showReplies: false,
      replyText: "",
    }

    setComments([...comments, newCommentObj])
    setNewComment("")

    toast({
      title: "Comment added",
      description: "Your comment has been posted successfully",
    })
  }

  const handleLikeComment = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          const newLiked = !comment.userLiked
          return {
            ...comment,
            likes: newLiked ? comment.likes + 1 : comment.likes - 1,
            userLiked: newLiked,
          }
        }
        return comment
      }),
    )
  }

  const handleToggleReplies = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            showReplies: !comment.showReplies,
          }
        }
        return comment
      }),
    )
  }

  const handleReplyTextChange = (commentId: string, text: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replyText: text,
          }
        }
        return comment
      }),
    )
  }

  const handleSubmitReply = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId && comment.replyText.trim()) {
          const newReply = {
            id: Math.random().toString(36).substring(2, 15),
            authorId: CURRENT_USER.id,
            content: comment.replyText,
            createdAt: new Date(),
            author: CURRENT_USER,
            likes: 0,
            userLiked: false,
          }

          return {
            ...comment,
            replies: [...comment.replies, newReply],
            replyText: "",
            showReplies: true,
          }
        }
        return comment
      }),
    )

    toast({
      title: "Reply added",
      description: "Your reply has been posted successfully",
    })
  }

  const handleLikeReply = (commentId: string, replyId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          const updatedReplies = comment.replies.map((reply) => {
            if (reply.id === replyId) {
              const newLiked = !reply.userLiked
              return {
                ...reply,
                likes: newLiked ? reply.likes + 1 : reply.likes - 1,
                userLiked: newLiked,
              }
            }
            return reply
          })

          return {
            ...comment,
            replies: updatedReplies,
          }
        }
        return comment
      }),
    )
  }

  // Get vote counts and user votes
  const questionVoteCount = questionVotes[question.id] !== undefined ? questionVotes[question.id] : question.voteCount

  const userQuestionVote = getUserVote(CURRENT_USER.id, question.id)
  const isQuestionSaved =
    savedItems[question.id] !== undefined ? savedItems[question.id] : isItemSaved(CURRENT_USER.id, question.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-gradient-to-br from-indigo-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float animation-delay-4000"></div>
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto p-4 relative z-10">
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors duration-200 animate-slide-in-left"
          onClick={() => router.push("/qa")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Q&A
        </Button>

        {/* Question Card */}
        <Card className="mb-6 overflow-hidden shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-slide-in-up">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="mb-4 flex items-center justify-between">
                <Link
                  href={`/profile/${question.author?.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-white/20">
                    <AvatarImage src={`/placeholder.svg?height=48&width=48`} alt={question.author?.name} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {question.author?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{question.author?.name}</p>
                    <p className="text-white/80">{formatRelativeTime(question.createdAt)}</p>
                  </div>
                </Link>
                <div className="flex gap-2">
                  {question.isResolved && (
                    <Badge className="bg-green-500 text-white border-0 animate-pulse">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-4">{question.title}</h1>
              <p className="text-white/90 text-lg leading-relaxed">{question.body}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {question.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-6 text-white/80">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{question.views} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{questionVoteCount} votes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>{answers.length} answers</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    userQuestionVote === "up"
                      ? "text-green-600 bg-green-50 hover:bg-green-100"
                      : "text-slate-600 hover:text-green-600 hover:bg-green-50",
                  )}
                  onClick={() => handleVote(question.id, "question", "up")}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Upvote ({questionVoteCount})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    userQuestionVote === "down"
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-slate-600 hover:text-red-600 hover:bg-red-50",
                  )}
                  onClick={() => handleVote(question.id, "question", "down")}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Downvote</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleCopyLink(question.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToSocial("facebook", question.id, question.title)}>
                      <Facebook className="mr-2 h-4 w-4" />
                      <span>Share to Facebook</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToSocial("twitter", question.id, question.title)}>
                      <Twitter className="mr-2 h-4 w-4" />
                      <span>Share to Twitter</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToSocial("linkedin", question.id, question.title)}>
                      <Linkedin className="mr-2 h-4 w-4" />
                      <span>Share to LinkedIn</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    isQuestionSaved
                      ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                      : "text-slate-600 hover:text-yellow-600 hover:bg-yellow-50",
                  )}
                  onClick={() => handleSaveItem(question.id)}
                >
                  <BookmarkPlus className="h-4 w-4" />
                  <span>{isQuestionSaved ? "Saved" : "Save"}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="mb-6 animate-slide-in-up" ref={commentsRef}>
          <h2 className="mb-4 text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            Comments ({comments.length})
          </h2>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              {comments.length > 0 ? (
                <div className="space-y-6">
                  {comments.map((comment, index) => (
                    <div key={comment.id} className={`space-y-3 animate-slide-in-up stagger-${(index % 3) + 1}`}>
                      <div className="flex gap-4">
                        <Link href={`/profile/${comment.author?.id}`}>
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-100">
                            <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={comment.author?.name} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600">
                              {comment.author?.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1">
                          <div className="rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 shadow-sm">
                            <Link href={`/profile/${comment.author?.id}`} className="hover:underline">
                              <p className="font-semibold text-slate-800">{comment.author?.name}</p>
                            </Link>
                            <p className="text-slate-700 mt-1">{comment.content}</p>
                          </div>
                          <div className="mt-2 flex gap-6 text-sm text-slate-500">
                            <button
                              className={cn(
                                "flex items-center gap-1 hover:text-red-600 transition-colors",
                                comment.userLiked ? "text-red-600" : "",
                              )}
                              onClick={() => handleLikeComment(comment.id)}
                            >
                              <Heart className="h-3 w-3" />
                              <span>{comment.likes > 0 ? comment.likes : "Like"}</span>
                            </button>
                            <button
                              className="hover:text-indigo-600 transition-colors"
                              onClick={() => handleToggleReplies(comment.id)}
                            >
                              Reply
                            </button>
                            <span>{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Report</DropdownMenuItem>
                            {comment.authorId === CURRENT_USER.id && <DropdownMenuItem>Delete</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Reply form */}
                      {comment.showReplies && (
                        <div className="ml-14 flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={CURRENT_USER.name} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600">
                              {CURRENT_USER.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="relative flex-1">
                            <Textarea
                              placeholder="Write a reply..."
                              className="min-h-[80px] pr-12 resize-none border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                              value={comment.replyText}
                              onChange={(e) => handleReplyTextChange(comment.id, e.target.value)}
                            />
                            <Button
                              size="icon"
                              className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                              disabled={!comment.replyText.trim()}
                              onClick={() => handleSubmitReply(comment.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.showReplies && comment.replies.length > 0 && (
                        <div className="ml-14 space-y-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <Link href={`/profile/${reply.author?.id}`}>
                                <Avatar className="h-8 w-8 ring-2 ring-slate-100">
                                  <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={reply.author?.name} />
                                  <AvatarFallback className="bg-slate-100 text-slate-600">
                                    {reply.author?.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1">
                                <div className="rounded-lg bg-slate-50 p-3 shadow-sm">
                                  <Link href={`/profile/${reply.author?.id}`} className="hover:underline">
                                    <p className="font-medium text-slate-800">{reply.author?.name}</p>
                                  </Link>
                                  <p className="text-slate-700 mt-1">{reply.content}</p>
                                </div>
                                <div className="mt-1 flex gap-4 text-xs text-slate-500">
                                  <button
                                    className={cn(
                                      "flex items-center gap-1 hover:text-red-600 transition-colors",
                                      reply.userLiked ? "text-red-600" : "",
                                    )}
                                    onClick={() => handleLikeReply(comment.id, reply.id)}
                                  >
                                    <Heart className="h-3 w-3" />
                                    <span>{reply.likes > 0 ? reply.likes : "Like"}</span>
                                  </button>
                                  <span>{formatRelativeTime(reply.createdAt)}</span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-400 hover:text-slate-600"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Report</DropdownMenuItem>
                                  {reply.authorId === CURRENT_USER.id && <DropdownMenuItem>Delete</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No comments yet. Be the first to comment!</p>
                </div>
              )}

              <Separator className="my-6" />

              <form onSubmit={handleSubmitComment} className="flex gap-4">
                <Avatar className="h-10 w-10 ring-2 ring-indigo-100">
                  <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={CURRENT_USER.name} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    {CURRENT_USER.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="relative flex-1">
                  <Textarea
                    placeholder="Write a comment..."
                    className="min-h-[80px] pr-12 resize-none border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Answers Section */}
        <div className="mb-6 animate-slide-in-up">
          <h2 className="mb-6 text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-600" />
            {answers.length} Answer{answers.length !== 1 ? "s" : ""}
          </h2>

          {answers.map((answer, index) => {
            const answerVoteCount = answerVotes[answer.id] !== undefined ? answerVotes[answer.id] : answer.voteCount
            const userAnswerVote = getUserVote(CURRENT_USER.id, answer.id)
            const isAnswerSaved =
              savedItems[answer.id] !== undefined ? savedItems[answer.id] : isItemSaved(CURRENT_USER.id, answer.id)

            return (
              <Card
                key={answer.id}
                className={`mb-6 overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm animate-slide-in-up stagger-${(index % 3) + 1}`}
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Link
                        href={`/profile/${answer.author?.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                          <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={answer.author?.name} />
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            {answer.author?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-800">{answer.author?.name}</p>
                          <p className="text-sm text-slate-500">{formatRelativeTime(answer.createdAt)}</p>
                        </div>
                      </Link>
                      {answer.isAccepted && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 animate-pulse">
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Accepted Answer
                        </Badge>
                      )}
                    </div>

                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-700 leading-relaxed">{answer.content}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex items-center gap-2 transition-all duration-200",
                          userAnswerVote === "up"
                            ? "text-green-600 bg-green-50 hover:bg-green-100"
                            : "text-slate-600 hover:text-green-600 hover:bg-green-50",
                        )}
                        onClick={() => handleVote(answer.id, "answer", "up")}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{answerVoteCount}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex items-center gap-2 transition-all duration-200",
                          userAnswerVote === "down"
                            ? "text-red-600 bg-red-50 hover:bg-red-100"
                            : "text-slate-600 hover:text-red-600 hover:bg-red-50",
                        )}
                        onClick={() => handleVote(answer.id, "answer", "down")}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
                          >
                            <Share2 className="h-4 w-4" />
                            <span>Share</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => handleCopyLink(answer.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Copy link</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareToSocial("facebook", answer.id, question.title)}>
                            <Facebook className="mr-2 h-4 w-4" />
                            <span>Share to Facebook</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareToSocial("twitter", answer.id, question.title)}>
                            <Twitter className="mr-2 h-4 w-4" />
                            <span>Share to Twitter</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareToSocial("linkedin", answer.id, question.title)}>
                            <Linkedin className="mr-2 h-4 w-4" />
                            <span>Share to LinkedIn</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex items-center gap-2 transition-all duration-200",
                          isAnswerSaved
                            ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                            : "text-slate-600 hover:text-yellow-600 hover:bg-yellow-50",
                        )}
                        onClick={() => handleSaveItem(answer.id)}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                        <span>{isAnswerSaved ? "Saved" : "Save"}</span>
                      </Button>
                      {!answer.isAccepted && question.isResolved === false && question.authorId === CURRENT_USER.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
                          onClick={() => handleAcceptAnswer(answer.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Accept Answer</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Add Answer Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-slide-in-up">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Your Answer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <Textarea
                placeholder="Write your answer here... Be detailed and helpful!"
                className="min-h-[200px] border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                required
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Help others by providing a clear, detailed answer with examples if possible.
                </p>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 px-8"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post Your Answer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
