"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
}

function initialsFrom(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function ProfileSection({ profile }: { profile: Profile }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [isUploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 2MB)");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;

      const formData = new FormData();
      formData.set("avatar_url", bustedUrl);
      await updateProfile(formData);

      setAvatarUrl(bustedUrl);
      toast.success("Foto de perfil atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfile(formData);
        toast.success("Perfil atualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao atualizar perfil");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-primary/10 text-lg font-semibold text-primary transition-colors hover:border-primary"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              initialsFrom(profile.name, profile.email)
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[0.65rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isUploading ? "..." : "Trocar"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="text-sm text-muted-foreground">
            PNG, JPG ou WEBP. Máximo 2MB.
          </div>
        </div>

        <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" defaultValue={profile.name ?? ""} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram_handle">Instagram</Label>
            <Input
              id="instagram_handle"
              name="instagram_handle"
              defaultValue={profile.instagram_handle ?? ""}
              placeholder="@seuusuario"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
