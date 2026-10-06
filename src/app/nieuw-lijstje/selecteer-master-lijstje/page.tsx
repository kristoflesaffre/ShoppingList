import { redirect } from "next/navigation";

/**
 * Er is geen aparte «kies favorietenlijst»-stap meer: je start een lijstje vanuit een favorietenlijst
 * met «+ Lijstje» op die lijst. Oude links gaan naar het overzicht van je favorieten.
 * (De vervolgstap `[masterId]/items` blijft bestaan.)
 */
export default function SelecteerMasterLijstjeRedirect() {
  redirect("/lijstjes-beheren/favorieten");
}
