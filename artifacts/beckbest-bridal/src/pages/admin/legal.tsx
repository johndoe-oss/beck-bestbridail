import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, ExternalLink, RefreshCw, FileText, ShieldCheck, Eye, Edit3, CheckCircle2 } from "lucide-react";

interface LegalDoc {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminLegalPage() {
  const { adminToken } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [termsData, setTermsData] = useState<LegalDoc>({
    slug: "terms",
    title: "Terms & Conditions",
    content: "",
  });

  const [privacyData, setPrivacyData] = useState<LegalDoc>({
    slug: "privacy",
    title: "Privacy Policy",
    content: "",
  });

  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const fetchLegalDocs = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bb-portal/legal", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load legal documents");
      }

      const data = await res.json();
      if (data.terms) setTermsData(data.terms);
      if (data.privacy) setPrivacyData(data.privacy);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error loading legal documents",
        description: err.message || "Could not retrieve legal documents from database",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalDocs();
  }, [adminToken]);

  const handleSave = async (slug: "terms" | "privacy") => {
    const docToSave = slug === "terms" ? termsData : privacyData;
    if (!docToSave.title.trim() || !docToSave.content.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and content cannot be empty",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/bb-portal/legal/${slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: docToSave.title,
          content: docToSave.content,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update database");
      }

      if (slug === "terms") {
        setTermsData(result.page);
      } else {
        setPrivacyData(result.page);
      }

      toast({
        title: "Saved to Database",
        description: `${docToSave.title} updated successfully. All users and visitors can now see these changes live.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: err.message || "An error occurred while updating the database.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (content: string) => {
    return (
      <div className="bg-muted/20 border border-border rounded-md p-6 sm:p-8 space-y-6 text-foreground font-light leading-relaxed">
        {content.split("\n\n").map((paragraph, idx) => {
          if (paragraph.startsWith("## ")) {
            return (
              <h2 key={idx} className="font-serif text-xl sm:text-2xl text-foreground pt-3 pb-1 border-b border-border/50 font-normal">
                {paragraph.replace("## ", "")}
              </h2>
            );
          }
          if (paragraph.startsWith("* ")) {
            const bulletLines = paragraph.split("\n");
            return (
              <ul key={idx} className="list-disc list-outside pl-5 space-y-2 text-sm sm:text-base">
                {bulletLines.map((line, bIdx) => {
                  const cleanLine = line.replace(/^\*\s*/, "");
                  const match = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
                  if (match) {
                    return (
                      <li key={bIdx}>
                        <strong className="font-medium text-foreground">{match[1]}</strong>
                        {match[2]}
                      </li>
                    );
                  }
                  return <li key={bIdx}>{cleanLine}</li>;
                })}
              </ul>
            );
          }
          return (
            <p key={idx} className="text-sm sm:text-base text-foreground/85 leading-relaxed">
              {paragraph}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Terms & Privacy CMS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit and manage your live production Terms & Conditions and Privacy Policy stored in the database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(activeTab === "terms" ? "/terms" : "/privacy", "_blank")}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Live {activeTab === "terms" ? "Terms" : "Privacy"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(activeTab)}
              disabled={saving || loading}
              className="gap-2 bg-primary text-primary-foreground"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes to Database
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "terms" | "privacy")} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-2">
              <TabsList className="bg-muted p-1">
                <TabsTrigger value="terms" className="gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Terms & Conditions
                </TabsTrigger>
                <TabsTrigger value="privacy" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Privacy Policy
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={previewMode === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("edit")}
                  className="gap-1.5 text-xs h-8"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editor
                </Button>
                <Button
                  type="button"
                  variant={previewMode === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("preview")}
                  className="gap-1.5 text-xs h-8"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </Button>
              </div>
            </div>

            {/* Terms Tab */}
            <TabsContent value="terms" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Terms & Conditions Document</span>
                    {termsData.updatedAt && (
                      <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        Saved in DB: {new Date(termsData.updatedAt).toLocaleString()}
                        {termsData.updatedBy ? ` by ${termsData.updatedBy}` : ""}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Governs orders, custom gown fittings, cancellations, returns, and client agreements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {previewMode === "edit" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="terms-title">Document Title</Label>
                        <Input
                          id="terms-title"
                          value={termsData.title}
                          onChange={(e) => setTermsData({ ...termsData, title: e.target.value })}
                          placeholder="e.g. Terms & Conditions"
                          className="font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="terms-content">Document Content (Sections &amp; Terms)</Label>
                          <span className="text-xs text-muted-foreground">
                            Tip: Use <code className="bg-muted px-1 rounded">## Heading</code> for sections and <code className="bg-muted px-1 rounded">* bullet</code> for list items
                          </span>
                        </div>
                        <Textarea
                          id="terms-content"
                          rows={20}
                          value={termsData.content}
                          onChange={(e) => setTermsData({ ...termsData, content: e.target.value })}
                          placeholder="Type or paste your Terms & Conditions content here..."
                          className="font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <h2 className="font-serif text-2xl font-bold mb-4">{termsData.title}</h2>
                      {renderPreview(termsData.content)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Privacy Policy Document</span>
                    {privacyData.updatedAt && (
                      <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        Saved in DB: {new Date(privacyData.updatedAt).toLocaleString()}
                        {privacyData.updatedBy ? ` by ${privacyData.updatedBy}` : ""}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Explains customer data handling, sizing privacy, payment security, and GDPR/privacy rights.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {previewMode === "edit" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="privacy-title">Document Title</Label>
                        <Input
                          id="privacy-title"
                          value={privacyData.title}
                          onChange={(e) => setPrivacyData({ ...privacyData, title: e.target.value })}
                          placeholder="e.g. Privacy Policy"
                          className="font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="privacy-content">Document Content</Label>
                          <span className="text-xs text-muted-foreground">
                            Tip: Use <code className="bg-muted px-1 rounded">## Heading</code> for sections and <code className="bg-muted px-1 rounded">* bullet</code> for list items
                          </span>
                        </div>
                        <Textarea
                          id="privacy-content"
                          rows={20}
                          value={privacyData.content}
                          onChange={(e) => setPrivacyData({ ...privacyData, content: e.target.value })}
                          placeholder="Type or paste your Privacy Policy content here..."
                          className="font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <h2 className="font-serif text-2xl font-bold mb-4">{privacyData.title}</h2>
                      {renderPreview(privacyData.content)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
