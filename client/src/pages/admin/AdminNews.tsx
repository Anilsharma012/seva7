import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Edit, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  titleHindi?: string;
  excerpt: string;
  excerptHindi?: string;
  content?: string;
  contentHindi?: string;
  imageUrl: string;
  category: string;
  categoryHindi?: string;
  source?: string;
  date: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const newsCategories = [
  { id: "Education", label: "Education" },
  { id: "Health", label: "Health" },
  { id: "Environment", label: "Environment" },
  { id: "Recognition", label: "Recognition" },
  { id: "Other", label: "Other" },
];

export default function AdminNews() {
  const { toast } = useToast();
  const uploadedPathRef = useRef<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    titleHindi: "",
    excerpt: "",
    excerptHindi: "",
    content: "",
    contentHindi: "",
    imageUrl: "",
    category: "Education",
    categoryHindi: "",
    source: "",
    date: new Date().toISOString().split('T')[0],
    isActive: true,
    order: 0,
  });

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/admin/news"],
    queryFn: async () => apiRequest("GET", "/api/admin/news", {}),
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/news", formData),
    onSuccess: () => {
      toast({ title: "Success", description: "News item created successfully" });
      resetForm();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create news item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => 
      apiRequest("PATCH", `/api/admin/news/${editingNews?.id}`, formData),
    onSuccess: () => {
      toast({ title: "Success", description: "News item updated successfully" });
      resetForm();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update news item", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/news/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Success", description: "News item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete news item", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      titleHindi: "",
      excerpt: "",
      excerptHindi: "",
      content: "",
      contentHindi: "",
      imageUrl: "",
      category: "Education",
      categoryHindi: "",
      source: "",
      date: new Date().toISOString().split('T')[0],
      isActive: true,
      order: 0,
    });
    setEditingNews(null);
    uploadedPathRef.current = "";
  };

  const handleEditClick = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      titleHindi: newsItem.titleHindi || "",
      excerpt: newsItem.excerpt,
      excerptHindi: newsItem.excerptHindi || "",
      content: newsItem.content || "",
      contentHindi: newsItem.contentHindi || "",
      imageUrl: newsItem.imageUrl,
      category: newsItem.category,
      categoryHindi: newsItem.categoryHindi || "",
      source: newsItem.source || "",
      date: new Date(newsItem.date).toISOString().split('T')[0],
      isActive: newsItem.isActive,
      order: newsItem.order,
    });
    uploadedPathRef.current = newsItem.imageUrl;
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const canSubmit = formData.title.trim() && formData.excerpt.trim() && formData.imageUrl.trim();

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">News & Media Management</h1>
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add News
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingNews ? "Edit News Item" : "Add News Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Image</label>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setUploading(true);
                        try {
                          const token = localStorage.getItem("auth_token");

                          if (!token) {
                            throw new Error("Authentication token not found. Please log in again.");
                          }

                          const urlResponse = await fetch("/api/uploads/request-url", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              name: file.name,
                              contentType: file.type,
                            }),
                          });

                          if (!urlResponse.ok) {
                            const errorData = await urlResponse.json().catch(() => ({ error: urlResponse.statusText }));
                            throw new Error(errorData.error || `Request failed with status ${urlResponse.status}`);
                          }

                          const { uploadURL, fileURL } = await urlResponse.json();

                          const uploadResponse = await fetch(uploadURL, {
                            method: "PUT",
                            headers: {
                              "Content-Type": file.type || "application/octet-stream",
                              Authorization: `Bearer ${token}`
                            },
                            body: file,
                          });

                          if (!uploadResponse.ok) {
                            throw new Error(`Upload failed with status ${uploadResponse.status}`);
                          }

                          uploadedPathRef.current = fileURL;
                          setFormData({ ...formData, imageUrl: fileURL });
                          toast({ title: "Success", description: "Image uploaded successfully" });

                          e.target.value = "";
                        } catch (error) {
                          console.error("Upload error:", error);
                          const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive"
                          });
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      className="hidden"
                      id="news-file-input"
                    />
                    <Button
                      onClick={() => document.getElementById("news-file-input")?.click()}
                      disabled={uploading}
                      variant="outline"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Image
                        </>
                      )}
                    </Button>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Image: {formData.imageUrl.split('/').pop()}
                      </p>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title (English)</label>
                    <Input
                      placeholder="News title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Title (Hindi)</label>
                    <Input
                      placeholder="समाचार शीर्षक"
                      value={formData.titleHindi}
                      onChange={(e) => setFormData({ ...formData, titleHindi: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Excerpt (English)</label>
                    <Textarea
                      placeholder="Brief summary"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Excerpt (Hindi)</label>
                    <Textarea
                      placeholder="संक्षिप्त सारांश"
                      value={formData.excerptHindi}
                      onChange={(e) => setFormData({ ...formData, excerptHindi: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Content (English)</label>
                    <Textarea
                      placeholder="Full content (optional)"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Content (Hindi)</label>
                    <Textarea
                      placeholder="पूर्ण सामग्री (वैकल्पिक)"
                      value={formData.contentHindi}
                      onChange={(e) => setFormData({ ...formData, contentHindi: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {newsCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category (Hindi)</label>
                    <Input
                      placeholder="श्रेणी"
                      value={formData.categoryHindi}
                      onChange={(e) => setFormData({ ...formData, categoryHindi: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Source / Media</label>
                    <Input
                      placeholder="e.g., Local News, Dainik Bhaskar"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Order</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 pb-1">
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => editingNews ? updateMutation.mutate() : createMutation.mutate()}
                    disabled={!canSubmit || createMutation.isPending || updateMutation.isPending || uploading}
                    className="flex-1"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingNews ? "Update" : "Create"} News
                  </Button>
                  <Button
                    onClick={() => handleDialogOpenChange(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No news items added yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {news.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative h-32 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          {item.titleHindi && <p className="text-sm text-muted-foreground">{item.titleHindi}</p>}
                        </div>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        {item.source && <Badge variant="outline">{item.source}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
