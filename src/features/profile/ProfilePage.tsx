import { BriefcaseBusiness, Mail, Save, UserRound } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fromNow } from "@/lib/dates";
import { profileService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const updated = await profileService.update(profile.id, {
      full_name: fullName,
      job_title: jobTitle,
    });
    if (updated) setProfile(updated);
    setSaving(false);
    setSaved(true);
    toast("Profile saved", { variant: "success" });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Avatar className="mb-4 h-20 w-20">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="mt-2 capitalize">{profile?.role ?? "—"}</Badge>
            {profile?.created_at && (
              <p className="mt-3 text-xs text-muted-foreground">Joined {fromNow(profile.created_at)}</p>
            )}
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Edit profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                Full name
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-muted-foreground" />
                Job title
              </Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Content Manager" />
            </div>
            <Separator />
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saved ? "Saved!" : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
