import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInstagramContent, useEnrichInstagram, InstagramProfile, InstagramContent } from '@/hooks/useInstagramData';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Instagram, 
  Users, 
  Heart, 
  MessageCircle, 
  Grid3X3, 
  Play,
  ExternalLink,
  Loader2,
  Search,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Link2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstagramSectionProps {
  leadId: string;
  instagramData: InstagramProfile | null;
  instagramUsername: string | null;
}

export function InstagramSection({ leadId, instagramData, instagramUsername }: InstagramSectionProps) {
  const [username, setUsername] = useState(instagramUsername || '');
  const { data: content, isLoading: loadingContent } = useInstagramContent(leadId);
  const enrichMutation = useEnrichInstagram();

  const handleEnrich = () => {
    if (!username.trim()) return;
    enrichMutation.mutate({ leadId, instagramUsername: username });
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const posts = content?.filter(c => c.content_type === 'post' || c.content_type === 'reel') || [];
  const stories = content?.filter(c => c.content_type === 'story') || [];

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-500" />
            Instagram do Lead
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                className="pl-8"
                onKeyDown={(e) => e.key === 'Enter' && handleEnrich()}
              />
            </div>
            <Button 
              onClick={handleEnrich} 
              disabled={enrichMutation.isPending || !username.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {enrichMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : instagramData ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">{instagramData ? 'Actualizar' : 'Pesquisar'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      {instagramData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-white/30 shadow-xl">
                  <AvatarImage src={instagramData.profile_pic_url_hd || instagramData.profile_pic_url} />
                  <AvatarFallback className="bg-white/20 text-white text-xl">
                    {instagramData.username?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-white">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{instagramData.full_name || instagramData.username}</h3>
                    {instagramData.is_verified && (
                      <CheckCircle2 className="h-5 w-5 text-white fill-white" />
                    )}
                  </div>
                  <p className="text-white/80">@{instagramData.username}</p>
                  {instagramData.category && (
                    <Badge className="mt-2 bg-white/20 text-white border-white/30">
                      {instagramData.category}
                    </Badge>
                  )}
                </div>
                <a 
                  href={`https://instagram.com/${instagramData.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ExternalLink className="h-5 w-5 text-white" />
                </a>
              </div>
            </div>
            
            <CardContent className="p-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                  <p className="text-2xl font-bold">{formatNumber(instagramData.follower_count)}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <p className="text-2xl font-bold">{formatNumber(instagramData.following_count)}</p>
                  <p className="text-xs text-muted-foreground">Seguindo</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
                  <p className="text-2xl font-bold">{formatNumber(instagramData.media_count)}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </div>

              {/* Bio */}
              {instagramData.biography && (
                <div className="p-3 rounded-xl bg-muted/50 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{instagramData.biography}</p>
                </div>
              )}

              {/* External Link */}
              {instagramData.external_url && (
                <a 
                  href={instagramData.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  {instagramData.external_url}
                </a>
              )}

              {/* Privacy Badge */}
              {instagramData.is_private && (
                <Badge variant="secondary" className="mt-3">
                  🔒 Conta Privada
                </Badge>
              )}

              {/* Fetched At */}
              {instagramData.fetched_at && (
                <p className="text-xs text-muted-foreground mt-3">
                  Atualizado {formatDistanceToNow(new Date(instagramData.fetched_at), { locale: ptBR, addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Content Tabs */}
      {(posts.length > 0 || stories.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <Tabs defaultValue="posts">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="posts" className="flex-1 gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Posts ({posts.length})
                  </TabsTrigger>
                  <TabsTrigger value="stories" className="flex-1 gap-2">
                    <Play className="h-4 w-4" />
                    Stories ({stories.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="mt-0">
                  <div className="grid grid-cols-3 gap-2">
                    {posts.map((post, index) => (
                      <ContentCard key={post.id} content={post} index={index} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="stories" className="mt-0">
                  <div className="grid grid-cols-3 gap-2">
                    {stories.map((story, index) => (
                      <ContentCard key={story.id} content={story} index={index} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transcriptions */}
      {content && content.some(c => c.transcription) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise de Conteúdo (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {content.filter(c => c.transcription).map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        {item.thumbnail_url || item.media_url ? (
                          <img 
                            src={item.thumbnail_url || item.media_url || ''} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {item.content_type === 'story' ? 'Story' : item.content_type === 'reel' ? 'Reel' : 'Post'}
                          </Badge>
                          {item.taken_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.taken_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.transcription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function ContentCard({ content, index }: { content: InstagramContent; index: number }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
      onClick={() => setShowDetails(!showDetails)}
    >
      {content.thumbnail_url || content.media_url ? (
        <img 
          src={content.thumbnail_url || content.media_url || ''} 
          alt="" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
        {content.likes_count !== null && content.likes_count > 0 && (
          <span className="flex items-center gap-1 text-sm">
            <Heart className="h-4 w-4" />
            {content.likes_count}
          </span>
        )}
        {content.comments_count !== null && content.comments_count > 0 && (
          <span className="flex items-center gap-1 text-sm">
            <MessageCircle className="h-4 w-4" />
            {content.comments_count}
          </span>
        )}
      </div>

      {/* Type Badge */}
      {content.content_type !== 'post' && (
        <div className="absolute top-1 right-1">
          <Play className="h-4 w-4 text-white drop-shadow-lg" />
        </div>
      )}

      {/* Transcription Indicator */}
      {content.transcription && (
        <div className="absolute bottom-1 right-1">
          <Sparkles className="h-3 w-3 text-yellow-400 drop-shadow-lg" />
        </div>
      )}
    </motion.div>
  );
}
