# Plan: Move Pro Tips to a Dialog/Modal

## Objective
Convert the current accordion-based "Pro Tips" section into a button that opens a dialog (modal) containing the full list of tips.

## Steps
1.  **Modify `src/components/pro-tips.tsx`**:
    *   Remove `Accordion` component usage.
    *   Introduce `Dialog` component (from `@/components/ui/dialog`).
    *   Create a button (e.g., "View Pro Tips" or an icon button) that triggers the `Dialog`.
    *   Inside the `DialogContent`, render the list of tips in a scrollable container.
2.  **Verify and Refactor**:
    *   Ensure the dialog looks clean and handles the list of tips appropriately.
    *   Ensure accessibility and responsive behavior.
3.  **Completion**:
    *   Perform a final check of the UI.
