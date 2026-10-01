"""
Source registry for framework requirements and authoritative references.
Section 14 / Phase 3: Traceability registry for CIS, NIST, DISA STIG, and ISO 27001.
"""

from typing import TypedDict


class SourceInfo(TypedDict):
    title: str
    url: str
    publisher: str
    verified: bool


FRAMEWORK_SOURCES: dict[str, SourceInfo] = {
    "CIS": {
        "title": "CIS Cisco IOS / Junos Security Benchmarks",
        "url": "https://www.cisecurity.org/cis-benchmarks",
        "publisher": "Center for Internet Security",
        "verified": True,
    },
    "NIST": {
        "title": "NIST Special Publication 800-53 Revision 5 (OSCAL Catalog)",
        "url": "https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final",
        "publisher": "National Institute of Standards and Technology",
        "verified": True,
    },
    "STIG": {
        "title": "DISA Network Infrastructure STIG & XCCDF Library",
        "url": "https://public.cyber.mil/stigs/",
        "publisher": "Defense Information Systems Agency",
        "verified": True,
    },
    "ISO": {
        "title": "ISO/IEC 27001:2022 Information Security Controls (Annex A)",
        "url": "https://www.iso.org/standard/27001",
        "publisher": "International Organization for Standardization",
        "verified": True,
    },
}


def get_source_info(framework: str) -> SourceInfo:
    fw_upper = framework.upper()
    return FRAMEWORK_SOURCES.get(
        fw_upper,
        {
            "title": f"Custom / Unverified Framework ({framework})",
            "url": "",
            "publisher": "Unknown",
            "verified": False,
        },
    )
