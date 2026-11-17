import CheckClient from "./CheckClient";

export const dynamic = "force-dynamic";

export default async function CheckPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { id } = await props.params;
  const { key } = await props.searchParams;
  return <CheckClient eventId={id} k={key || ""} />;
}
