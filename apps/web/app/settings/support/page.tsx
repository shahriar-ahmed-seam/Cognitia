"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, MessageSquare, Mail, Phone, FileText, ExternalLink, Send } from "lucide-react"

export default function SupportPage() {
  const [ticketSubject, setTicketSubject] = useState("")
  const [ticketCategory, setTicketCategory] = useState("")
  const [ticketPriority, setTicketPriority] = useState("medium")
  const [ticketDescription, setTicketDescription] = useState("")
  const [contactEmail, setContactEmail] = useState("john.doe@example.com")

  const handleSubmitTicket = () => {
    // Handle ticket submission logic here
    console.log("Submitting support ticket...")
  }

  const faqItems = [
    {
      question: "How do I reset my password?",
      answer:
        "You can reset your password by clicking the 'Forgot Password' link on the login page. Enter your email address and we'll send you instructions to reset your password.",
    },
    {
      question: "How do I change my email address?",
      answer:
        "Go to Settings > Account and update your email address. You'll need to verify the new email address before the change takes effect.",
    },
    {
      question: "Can I export my notes?",
      answer:
        "Yes, you can export your notes in various formats including PDF, Markdown, and HTML. Go to your notes and click the export button.",
    },
    {
      question: "How do I delete my account?",
      answer:
        "Account deletion is permanent and cannot be undone. Go to Settings > Account > Danger Zone and click 'Delete Account'. You'll need to confirm this action.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual subscriptions.",
    },
    {
      question: "How do I cancel my subscription?",
      answer:
        "You can cancel your subscription at any time from Settings > Account > Subscription. Your access will continue until the end of your current billing period.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes, we use industry-standard encryption to protect your data. All data is encrypted in transit and at rest. We also perform regular security audits.",
    },
    {
      question: "Can I collaborate with others on notes?",
      answer:
        "Yes, you can share notes with other users and collaborate in real-time. Use the share button on any note to invite collaborators.",
    },
  ]

  const supportTickets = [
    {
      id: "TICK-001",
      subject: "Unable to access my notes",
      category: "Technical Issue",
      priority: "high",
      status: "open",
      createdAt: new Date("2024-01-10"),
      lastUpdate: new Date("2024-01-12"),
    },
    {
      id: "TICK-002",
      subject: "Billing question about subscription",
      category: "Billing",
      priority: "medium",
      status: "resolved",
      createdAt: new Date("2024-01-05"),
      lastUpdate: new Date("2024-01-06"),
    },
    {
      id: "TICK-003",
      subject: "Feature request: Dark mode",
      category: "Feature Request",
      priority: "low",
      status: "in_progress",
      createdAt: new Date("2024-01-01"),
      lastUpdate: new Date("2024-01-08"),
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-blue-500 animate-pulse" />
          Support & Help
        </h1>
        <p className="text-slate-600 mt-2">Get help and contact our support team</p>
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="faq">
            <HelpCircle className="h-4 w-4 mr-2 animate-pulse" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact">
            <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
            Contact Us
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <FileText className="h-4 w-4 mr-2 animate-pulse" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="resources">
            <ExternalLink className="h-4 w-4 mr-2 animate-pulse" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-slate-600">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>Get personalized help from our support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Your Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-subject">Subject</Label>
                  <Input
                    id="ticket-subject"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-category">Category</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger id="ticket-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="account">Account & Profile</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-priority">Priority</Label>
                    <Select value={ticketPriority} onValueChange={setTicketPriority}>
                      <SelectTrigger id="ticket-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-description">Description</Label>
                  <Textarea
                    id="ticket-description"
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Please provide detailed information about your issue..."
                    className="min-h-32"
                  />
                </div>

                <Button onClick={handleSubmitTicket} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Other Ways to Reach Us</CardTitle>
                <CardDescription>Alternative contact methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Email Support</h3>
                    <p className="text-sm text-slate-600 mb-2">For general inquiries and non-urgent issues</p>
                    <a href="mailto:support@studyplatform.com" className="text-blue-600 hover:underline">
                      support@studyplatform.com
                    </a>
                    <p className="text-xs text-slate-500 mt-1">Response time: 24-48 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Live Chat</h3>
                    <p className="text-sm text-slate-600 mb-2">Real-time support for urgent issues</p>
                    <Button variant="outline" size="sm">
                      Start Live Chat
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">Available: Mon-Fri 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Phone className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Phone Support</h3>
                    <p className="text-sm text-slate-600 mb-2">For premium subscribers only</p>
                    <span className="font-mono">+1 (555) 123-4567</span>
                    <p className="text-xs text-slate-500 mt-1">Available: Mon-Fri 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Response Times</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div>• Urgent issues: Within 2 hours</div>
                    <div>• High priority: Within 8 hours</div>
                    <div>• Medium priority: Within 24 hours</div>
                    <div>• Low priority: Within 48 hours</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Your Support Tickets</CardTitle>
              <CardDescription>Track the status of your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {supportTickets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No support tickets</h3>
                  <p className="text-slate-500">You haven't submitted any support tickets yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{ticket.subject}</h3>
                            <Badge variant="outline" className="text-xs">
                              {ticket.id}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>Category: {ticket.category}</span>
                            <span>Created: {ticket.createdAt.toLocaleDateString()}</span>
                            <span>Last Update: {ticket.lastUpdate.toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)} variant="secondary">
                            {ticket.status.replace("_", " ").charAt(0).toUpperCase() +
                              ticket.status.replace("_", " ").slice(1)}
                          </Badge>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>Comprehensive guides and tutorials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Getting Started Guide</h4>
                      <p className="text-sm text-slate-600">Learn the basics of using our platform</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Note-Taking Best Practices</h4>
                      <p className="text-sm text-slate-600">Tips for effective note organization</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">API Documentation</h4>
                      <p className="text-sm text-slate-600">Technical documentation for developers</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Keyboard Shortcuts</h4>
                      <p className="text-sm text-slate-600">Speed up your workflow with shortcuts</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Community</CardTitle>
                <CardDescription>Connect with other users and get help</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Community Forum</h4>
                      <p className="text-sm text-slate-600">Ask questions and share knowledge</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Discord Server</h4>
                      <p className="text-sm text-slate-600">Real-time chat with the community</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Feature Requests</h4>
                      <p className="text-sm text-slate-600">Suggest new features and improvements</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">Bug Reports</h4>
                      <p className="text-sm text-slate-600">Report issues and track fixes</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
