import Link from "next/link";
import AddForm from "./add-form";

export const metadata = { title: "Add products" };

export default function AddProductsPage() {
  return (
    <main className="board-shell">
      <p className="board-back"><Link href="/board">&larr; Link board</Link></p>
      <h1>Add products</h1>
      <p className="board-sub">
        Paste Amazon links, or just type what the product is, one per line. Links stuck together are fine; I&apos;ll split them.
      </p>
      <AddForm />
    </main>
  );
}
