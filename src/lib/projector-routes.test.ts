import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), on: vi.fn(), off: vi.fn(), check: vi.fn() }));
vi.mock("./server/google-connection-store", () => ({ verifiedUserId: m.user }));
vi.mock("./server/projector-local", () => ({ projectorConfigured: m.configured, wakeProjector: m.on, sleepProjector: m.off, inspectProjector: m.check }));
import { projectorLocal } from "./server/projector-routes";
function request(body: unknown, host="127.0.0.1:3000", origin=`http://${host}`) { return new NextRequest(`http://${host}/api/projector`, {method:"POST",headers:{host,origin,"content-type":"application/json"},body:JSON.stringify(body)}); }
beforeEach(() => {vi.resetAllMocks();m.user.mockResolvedValue("owner");m.configured.mockResolvedValue(true);for(const fn of [m.on,m.off,m.check])fn.mockResolvedValue({configured:true,accepted:true,isOn:true});});
it("routes on, off and inspection independently to the paired projector", async () => {
 for(const [action,fn] of [["on",m.on],["off",m.off],["status",m.check]] as const){expect((await projectorLocal(request({action}))).status).toBe(200);expect(fn).toHaveBeenCalledWith("owner");}
 expect(m.on).toHaveBeenCalledTimes(1);expect(m.off).toHaveBeenCalledTimes(1);expect(m.check).toHaveBeenCalledTimes(1);
});
it("rejects public hosts, cross-origin requests, unauthenticated and unpaired users", async () => {
 expect((await projectorLocal(request({action:"on"},"example.com"))).status).toBe(503);
 expect((await projectorLocal(request({action:"on"},undefined,"https://evil.example"))).status).toBe(403);
 m.user.mockResolvedValue(null);expect((await projectorLocal(request({action:"on"}))).status).toBe(401);
 m.user.mockResolvedValue("other");m.configured.mockResolvedValue(false);expect((await projectorLocal(request({action:"off"}))).status).toBe(403);
 expect(m.on).not.toHaveBeenCalled();expect(m.off).not.toHaveBeenCalled();
});
it("rejects arbitrary commands and extra payload fields", async () => {
 for(const body of [{action:"down"},{action:"on",host:"elsewhere"},{action:"on;shutdown"},null,[]])expect((await projectorLocal(request(body))).status).toBe(400);
 expect(m.on).not.toHaveBeenCalled();
});
it("preserves a diagnostic when the projector does not respond", async () => {
 m.check.mockResolvedValue({configured:true,accepted:false,error:"unreachable"});const response=await projectorLocal(request({action:"status"}));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:"unreachable"});expect(response.headers.get("cache-control")).toBe("no-store");
});
