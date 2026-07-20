import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileActions } from "@/components/file-actions";
import type { FileWithThumb } from "@/components/file-list";
import { categoryLabel, formatBytes, formatDate } from "@/lib/files";

export function FileTable({ files }: { files: FileWithThumb[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
        Tidak ada file. Upload file pertama kamu di atas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama File</TableHead>
            <TableHead className="w-20">Tipe</TableHead>
            <TableHead className="w-40">Folder</TableHead>
            <TableHead className="w-24">Ukuran</TableHead>
            <TableHead className="w-44">Tanggal Upload</TableHead>
            <TableHead className="w-48 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="max-w-xs truncate font-medium" title={file.name}>
                {file.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{file.ext.toUpperCase()}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {categoryLabel(file.category) ?? "—"}
              </TableCell>
              <TableCell>{formatBytes(file.size_bytes)}</TableCell>
              <TableCell>{formatDate(file.created_at)}</TableCell>
              <TableCell>
                <FileActions
                  id={file.id}
                  name={file.name}
                  ext={file.ext}
                  previewUrl={file.thumbUrl}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
