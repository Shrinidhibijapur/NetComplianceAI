# Hand-labeled bootstrap set (Section 4.2 step 2). Loaded into the DB + vector store on first
# boot only (if the training_examples table is empty) — after that, human labels take over.
SEED_EXAMPLES: list[dict[str, str]] = [
    {"vendor": "cisco_ios", "line_text": "ip ssh version 2", "canonical_key": "ssh_version"},
    {"vendor": "cisco_ios", "line_text": "no ip http server", "canonical_key": "http_mgmt_enabled"},
    {"vendor": "cisco_ios", "line_text": "service password-encryption", "canonical_key": "password_encryption"},
    {"vendor": "cisco_ios", "line_text": "logging host 10.0.0.5", "canonical_key": "logging_enabled"},
    {"vendor": "cisco_ios", "line_text": "ntp server 10.0.0.1", "canonical_key": "ntp_configured"},
    {"vendor": "cisco_ios", "line_text": "snmp-server community public RO", "canonical_key": "snmp_community_default"},
    {"vendor": "juniper_junos", "line_text": "set system services ssh", "canonical_key": "ssh_version"},
    {"vendor": "juniper_junos", "line_text": "set system services telnet", "canonical_key": "telnet_enabled"},
    {"vendor": "juniper_junos", "line_text": "set system syslog host 10.0.0.5 any any", "canonical_key": "logging_enabled"},
    {"vendor": "juniper_junos", "line_text": "set snmp community public authorization read-only", "canonical_key": "snmp_community_default"},
]
