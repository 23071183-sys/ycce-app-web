import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// A failed load or save, said plainly, with a way to try again. Use this rather
// than leaving an empty table that looks like there's simply no data.
export function ErrorBanner({
  title = "Couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive" className="mb-6 border-destructive/30 bg-destructive-soft">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message || 'Check your connection and try again. The server can take a few seconds to wake up.'}</p>
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
