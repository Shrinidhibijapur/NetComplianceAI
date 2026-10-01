import os
import tempfile

# Must run before `app` is imported: point the app at a throwaway DB so tests never touch (or
# depend on) a developer's complianceai.db.
_tmp = tempfile.mkdtemp(prefix="complianceai-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
