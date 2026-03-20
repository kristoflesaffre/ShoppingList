import { init } from "@instantdb/react";
import schema from "../../instant.schema";

export const db = init({
  appId: "c63df57f-510a-46bc-8687-912d030c9359",
  schema,
});
