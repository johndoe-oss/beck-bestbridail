import React, { useState } from 'react';
import { useSendEmailNotification } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminNotifications() {
  const { toast } = useToast();
  const emailMutation = useSendEmailNotification();

  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [smsSubmitting, setSmsSubmitting] = useState(false);

  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    recipientType: 'all' as 'all' | 'verified' | 'specific',
    recipientIds: ''
  });

  const [smsData, setSmsData] = useState({
    message: '',
    recipientType: 'all' as 'all' | 'verified' | 'specific',
    recipientIds: ''
  });

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.subject || !emailData.message) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Subject and message are required.' });
      return;
    }

    const payload: any = {
      subject: emailData.subject,
      message: emailData.message,
      recipientType: emailData.recipientType,
    };

    if (emailData.recipientType === 'specific') {
      const ids = emailData.recipientIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length === 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter valid comma-separated customer IDs.' });
        return;
      }
      payload.recipientIds = ids;
    }

    try {
      setEmailSubmitting(true);
      const res = await fetch('/api/bb-portal/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_admin_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send email');
      toast({ title: 'Email Sent', description: `Sent to ${json.sent} customers. ${json.failed > 0 ? `${json.failed} failed.` : ''}` });
      setEmailData({ subject: '', message: '', recipientType: 'all', recipientIds: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to send email.' });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsData.message) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Message is required.' });
      return;
    }

    const payload: any = {
      message: smsData.message,
      recipientType: smsData.recipientType,
    };

    if (smsData.recipientType === 'specific') {
      const ids = smsData.recipientIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length === 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter valid comma-separated customer IDs.' });
        return;
      }
      payload.recipientIds = ids;
    }

    try {
      setSmsSubmitting(true);
      const res = await fetch('/api/bb-portal/notifications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_admin_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send SMS');
      toast({ title: 'SMS Sent', description: `Sent to ${json.sent} customers. ${json.failed > 0 ? `${json.failed} failed.` : ''}` });
      setSmsData({ message: '', recipientType: 'all', recipientIds: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to send SMS.' });
    } finally {
      setSmsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif text-foreground">Notifications</h1>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="mb-6 grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="email" className="flex gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
          <TabsTrigger value="sms" className="flex gap-2"><MessageSquare className="h-4 w-4" /> SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <form onSubmit={handleSendEmail}>
              <CardHeader>
                <CardTitle>Send Email Broadcast</CardTitle>
                <CardDescription>Send an email notification to your customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Recipients</label>
                  <Select
                    value={emailData.recipientType}
                    onValueChange={(v: any) => setEmailData(prev => ({ ...prev, recipientType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="verified">Verified Customers Only</SelectItem>
                      <SelectItem value="specific">Specific Customers (IDs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {emailData.recipientType === 'specific' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Customer IDs (Comma separated)</label>
                    <Input
                      placeholder="e.g. 1, 4, 7"
                      value={emailData.recipientIds}
                      onChange={(e) => setEmailData(prev => ({ ...prev, recipientIds: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Subject Line</label>
                  <Input
                    placeholder="New Collection Dropping Tomorrow"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                  <Textarea
                    placeholder="Dear customer, we are thrilled to announce..."
                    className="min-h-[200px]"
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">HTML formatting is not supported in this basic editor.</p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border px-6 py-4">
                <Button type="submit" disabled={emailSubmitting} className="ml-auto">
                  <Send className="mr-2 h-4 w-4" />
                  {emailSubmitting ? 'Sending...' : 'Send Email'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <form onSubmit={handleSendSms}>
              <CardHeader>
                <CardTitle>Send SMS Broadcast</CardTitle>
                <CardDescription>Send a text message notification to your customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Recipients</label>
                  <Select
                    value={smsData.recipientType}
                    onValueChange={(v: any) => setSmsData(prev => ({ ...prev, recipientType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="verified">Verified Customers Only</SelectItem>
                      <SelectItem value="specific">Specific Customers (IDs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {smsData.recipientType === 'specific' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Customer IDs (Comma separated)</label>
                    <Input
                      placeholder="e.g. 1, 4, 7"
                      value={smsData.recipientIds}
                      onChange={(e) => setSmsData(prev => ({ ...prev, recipientIds: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                  <div className="relative">
                    <Textarea
                      placeholder="Beckbest Bridal: Our fall collection is live! Shop now at beckbest.com"
                      className="min-h-[100px] resize-none"
                      value={smsData.message}
                      onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
                      maxLength={160}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background px-1">
                      {smsData.message.length}/160
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border px-6 py-4">
                <Button type="submit" disabled={smsSubmitting} className="ml-auto">
                  <Send className="mr-2 h-4 w-4" />
                  {smsSubmitting ? 'Sending...' : 'Send SMS'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}