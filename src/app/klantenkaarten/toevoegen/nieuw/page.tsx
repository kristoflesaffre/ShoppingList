import { redirect } from "next/navigation";

/** Vervallen: een winkel kiezen opent nu meteen het blad «Kaart van …» op de winkelkeuze. */
export default function KlantenkaartToevoegenRedirect() {
  redirect("/klantenkaarten/toevoegen");
}
