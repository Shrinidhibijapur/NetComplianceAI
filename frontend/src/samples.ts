// Bundled demo configs (mirrors backend/tests/fixtures) so the app is usable with
// zero real device data — synthetic/safe, per docs/Implementation_Plan.md Section 9.
export interface SampleConfig {
  label: string;
  filename: string;
  vendor: string;
  deviceId: string;
  content: string;
}

export const SAMPLE_CONFIGS: SampleConfig[] = [
  {
    label: "Cisco IOS — core switch (mostly hardened)",
    filename: "cisco_ios_sample.cfg",
    vendor: "cisco_ios",
    deviceId: "core-sw-01",
    content: `hostname core-sw-01
!
service password-encryption
!
ip ssh version 2
no ip http server
!
line vty 0 4
 transport input ssh
!
logging host 10.0.0.5
ntp server 10.0.0.1
snmp-server community public RO
!
access-list 101 deny ip any any
!
some-vendor-specific-feature enable-quantum-flux
end
`,
  },
  {
    label: "Juniper Junos — edge firewall (needs hardening)",
    filename: "juniper_junos_sample.cfg",
    vendor: "juniper_junos",
    deviceId: "edge-fw-01",
    content: `set system host-name edge-fw-01
set system services ssh
set system services web-management http
set system syslog host 10.0.0.5 any any
set system ntp server 10.0.0.1
set snmp community public authorization read-only
set firewall filter PROTECT term deny-all then discard
set some-vendor-specific unknown-knob value
`,
  },
  {
    label: "SONiC whitebox — unknown vendor (AI training demo)",
    filename: "sonic_sample.cfg",
    vendor: "sonic_whitebox",
    deviceId: "tor-sw-14",
    content: `! SONiC-style whitebox switch config — deliberately in a syntax our L1 parser has never seen.
config ssh-server enable version2
config telnet-server disable
config snmp community add public ro
config syslog server add 10.0.0.5
`,
  },
];

export function sampleAsFile(sample: SampleConfig): File {
  return new File([sample.content], sample.filename, { type: "text/plain" });
}
