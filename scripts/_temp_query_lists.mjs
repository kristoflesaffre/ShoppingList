import { init } from "@instantdb/admin";

const APP_ID = "c63df57f-510a-46bc-8687-912d030c9359";
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const result = await db.query({
  $users: {},
  lists: { items: {} },
});

const me = result.$users.find(u => u.email === "lesaffrekristof@gmail.com");
console.log("My userId:", me?.id);

const myLists = result.lists.filter(l => l.ownerId === me?.id);
console.log(`Found ${myLists.length} lists for lesaffrekristof@gmail.com\n`);

for (const list of myLists) {
  console.log(`--- LIST: "${list.name}" (id=${list.id}, isMaster=${list.isMasterTemplate ?? false}, icon=${list.icon}, masterIcon=${list.masterIcon ?? "-"}, items=${list.items?.length ?? 0}) ---`);
}
