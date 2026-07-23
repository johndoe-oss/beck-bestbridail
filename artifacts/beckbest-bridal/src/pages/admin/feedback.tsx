import React, { useState } from 'react';
import { useAdminListFeedback, useAdminUpdateFeedback } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, CheckCircle, Reply, Mail, Phone, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminFeedback() {
  const { toast } = useToast();
  const { data: feedbackData, isLoading } = useAdminListFeedback();
  const updateFeedback = useAdminUpdateFeedback();

  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const feedbacks = feedbackData?.feedbacks || [];
  const total = feedbackData?.total || 0;

  const unreadCount = feedbacks.filter(f => !f.isRead).length;
  const readCount = feedbacks.filter(f => f.isRead).length;

  const handleMarkRead = async (id: number) => {
    try {
      await updateFeedback.mutateAsync({ id, data: { isRead: true } });
      toast({ title: 'Marked as read' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to update' });
    }
  };

  const handleReply = async (id: number) => {
    const reply = replyText[id];
    if (!reply || !reply.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a reply message.' });
      return;
    }
    try {
      await updateFeedback.mutateAsync({ id, data: { adminReply: reply, isRead: true } });
      toast({ title: 'Reply sent' });
      setReplyText(prev => ({ ...prev, [id]: '' }));
      setReplyingTo(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to send reply' });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feedback': return 'bg-blue-100 text-blue-800';
      case 'suggestion': return 'bg-purple-100 text-purple-800';
      case 'problem': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-serif">Customer Feedback</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif text-foreground">Customer Feedback</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {total} Total
          </Badge>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
              {unreadCount} Unread
            </Badge>
          )}
        </div>
      </div>

      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">No feedback yet</p>
            <p className="text-muted-foreground text-sm">Customer messages will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id} className={`border ${!feedback.isRead ? 'border-primary/30 bg-primary/[0.02]' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getTypeColor(feedback.type)}>
                        {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                      </Badge>
                      {!feedback.isRead && (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-[10px]">
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(feedback.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Customer Info */}
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{feedback.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{feedback.customerEmail}</span>
                  </div>
                  {feedback.customerPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{feedback.customerPhone}</span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="bg-card border border-border rounded-lg p-4 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{feedback.message}</p>
                </div>

                {/* Admin Reply */}
                {feedback.adminReply && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                      <Reply className="h-3 w-3" /> Your Reply:
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{feedback.adminReply}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {!feedback.isRead && (
                    <Button variant="outline" size="sm" onClick={() => handleMarkRead(feedback.id)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark as Read
                    </Button>
                  )}
                  <Button
                    variant={replyingTo === feedback.id ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === feedback.id ? null : feedback.id)}
                  >
                    <Reply className="h-3.5 w-3.5 mr-1" /> Reply
                  </Button>
                </div>

                {/* Reply Form */}
                {replyingTo === feedback.id && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      className="min-h-[100px]"
                      value={replyText[feedback.id] || ''}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [feedback.id]: e.target.value }))}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setReplyingTo(null); setReplyText(prev => ({ ...prev, [feedback.id]: '' })); }}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleReply(feedback.id)} disabled={updateFeedback.isPending}>
                        {updateFeedback.isPending ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

