import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Tenant(models.Model):
    """Company profile for this 1OS installation (single-tenant per server)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    site_url = models.CharField(max_length=255, blank=True, null=True, help_text='e.g. https://customer.sim-eng.com')
    files_url = models.CharField(max_length=255, blank=True, null=True, help_text='FileBrowser URL, e.g. https://files.astronic.com.sg/')
    logo = models.CharField(max_length=500, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    uen = models.CharField(max_length=50, blank=True, null=True, help_text='Unique Entity Number (UEN) — mandatory for all SG registered entities')
    gst_registered = models.BooleanField(default=False)
    gst_number = models.CharField(max_length=50, blank=True, null=True, help_text='GST Registration Number — only if GST registered')
    modules = models.JSONField(default=list, blank=True, help_text='List of module keys enabled on this installation')
    project_prefix = models.CharField(max_length=10, default='SE', help_text='Prefix for auto-generated project numbers, e.g. SE → SE-26-001')
    signatory_name = models.CharField(max_length=255, blank=True, null=True, help_text='Name printed on quotation/invoice signature block')
    signatory_designation = models.CharField(max_length=255, blank=True, null=True, help_text='Designation printed on quotation/invoice signature block')
    signatory_file = models.ImageField(upload_to='tenant/signatory/', blank=True, null=True, help_text='Signature image embedded in generated documents')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'superadmin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """System user for a tenant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users', db_column='tenant_id')
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(
        max_length=20,
        choices=[
            ('superadmin', 'Super Admin'),
            ('admin', 'Admin'),
            ('manager', 'Manager'),
            ('supervisor', 'Supervisor'),
            ('foreman', 'Foreman'),
            ('staff', 'Staff'),
            ('viewer', 'Viewer'),
        ],
        default='staff',
    )
    permission_group = models.ForeignKey(
        'PermissionGroup',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users',
        help_text='Custom permission group — overrides role defaults if set',
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    mfa_enabled = models.BooleanField(default=False)
    avatar = models.CharField(max_length=500, blank=True, null=True)
    modules      = models.JSONField(default=list, blank=True, help_text='List of module keys this user can access')
    preferences  = models.JSONField(default=dict, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    @property
    def resolved_permissions(self):
        from shared.permissions import ROLE_DEFAULT_PERMISSIONS
        if self.role == 'superadmin':
            return None  # superadmin bypasses all checks
        if self.permission_group_id and self.permission_group:
            return self.permission_group.permissions
        return ROLE_DEFAULT_PERMISSIONS.get(self.role, [])

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email


class PermissionGroup(models.Model):
    """Custom permission bundle for a tenant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='permission_groups', db_column='tenant_id')
    name = models.CharField(max_length=100)
    permissions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
