import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Users, Target } from 'lucide-react';
import type { Goal } from '@/hooks/useGoals';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalsTableProps {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => Promise<void>;
}

const METRIC_LABELS: Record<string, string> = {
  receita: 'Receita',
  vendas: 'Vendas',
  leads: 'Leads',
  agendamentos: 'Agendamentos',
};

function formatTarget(metric: string, target: number): string {
  if (metric === 'receita') {
    return target.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });
  }
  return target.toLocaleString('pt-BR');
}

export function GoalsTable({ goals, onEdit, onDelete }: GoalsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const teamGoals = goals.filter((g) => g.member_name === null);
  const individualGoals = goals.filter((g) => g.member_name !== null);
  const sorted = [...teamGoals, ...individualGoals];

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (goals.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-muted">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhuma meta definida para este mês</p>
              <p className="text-sm text-muted-foreground">
                Clique em "Nova Meta" para começar a planejar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {sorted.map((goal) => (
                  <motion.tr
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      {goal.member_name ? (
                        <span className="font-medium">{goal.member_name}</span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 font-medium"
                        >
                          <Users className="h-3 w-3" />
                          Equipe
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {goal.role ? (
                        <Badge
                          variant="outline"
                          className={
                            goal.role === 'SDR'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-purple-500 text-purple-600'
                          }
                        >
                          {goal.role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{METRIC_LABELS[goal.metric] ?? goal.metric}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatTarget(goal.metric, goal.target)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(goal)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
