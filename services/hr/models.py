from django.db import models
from shared.models import BaseModel
from shared.storage import FileBrowserStorage


class Employee(BaseModel):
    """Staff member record within a tenant."""
    PASS_TYPES = [
        ('citizen', 'Citizen'),
        ('pr', 'Permanent Resident'),
        ('ep', 'Employment Pass'),
        ('sp', 'S Pass'),
        ('wp', 'Work Permit'),
        ('other', 'Other'),
    ]
    EMPLOYMENT_TYPES = [
        ('fulltime', 'Full Time'),
        ('parttime', 'Part Time'),
        ('contract', 'Contract'),
        ('intern', 'Intern'),
    ]

    user = models.OneToOneField(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employee_profile', help_text='Linked system account if any'
    )
    emp_no = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    nric = models.CharField(max_length=20, blank=True, null=True, help_text='Encrypted at rest')
    nationality = models.CharField(max_length=50, blank=True, null=True)
    pass_type = models.CharField(max_length=10, choices=PASS_TYPES, blank=True, null=True)
    pass_expiry = models.DateField(null=True, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.ForeignKey(
        'organisation.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='employees'
    )
    position = models.ForeignKey(
        'organisation.Position', on_delete=models.SET_NULL, null=True, blank=True, related_name='employees'
    )
    join_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES, default='fulltime')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    emergency_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    manager = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates',
        verbose_name='Supervisor'
    )
    photo = models.ImageField(storage=FileBrowserStorage(subfolder='database'), null=True, blank=True)
    can_clock_in = models.BooleanField(default=False, help_text='Employee can use clock-in/out feature')

    def __str__(self):
        return f"{self.emp_no} — {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class LeaveType(BaseModel):
    """Defines a type of leave (Annual, MC, Unpaid, etc.)."""
    name = models.CharField(max_length=100)
    days_per_year = models.DecimalField(max_digits=5, decimal_places=1)
    paid = models.BooleanField(default=True)
    carry_forward = models.BooleanField(default=False)
    max_carry = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class LeaveBalance(BaseModel):
    """Tracks remaining leave balance per employee per leave type per year."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='balances')
    year = models.IntegerField()
    entitled = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    taken = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_forward = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        unique_together = ('employee', 'leave_type', 'year')

    def __str__(self):
        return f"{self.employee} — {self.leave_type} ({self.year})"

    @property
    def remaining(self):
        return self.entitled + self.carried_forward - self.taken


class LeaveApplication(BaseModel):
    """Leave request submitted by an employee."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_applications')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='applications')
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=5, decimal_places=1)
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.employee} — {self.leave_type} ({self.start_date} to {self.end_date})"


class Attendance(BaseModel):
    """Daily attendance record for an employee."""
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('half_day', 'Half Day'),
        ('leave', 'On Leave'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)
    hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    overtime = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    notes = models.TextField(blank=True, null=True)
    clock_in_photo = models.ImageField(storage=FileBrowserStorage(subfolder='attendance'), null=True, blank=True)
    clock_out_photo = models.ImageField(storage=FileBrowserStorage(subfolder='attendance'), null=True, blank=True)
    clock_in_gps = models.JSONField(null=True, blank=True, help_text='GPS coords at clock-in: {"lat": x, "lng": y}')
    clock_out_gps = models.JSONField(null=True, blank=True, help_text='GPS coords at clock-out: {"lat": x, "lng": y}')
    clock_in_address = models.CharField(max_length=500, blank=True, null=True)
    clock_out_address = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee} — {self.date} ({self.status})"


class Certification(BaseModel):
    """Employee certification or qualification record."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255, blank=True, null=True)
    cert_number = models.CharField(max_length=100, blank=True, null=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    document = models.CharField(max_length=500, blank=True, null=True, help_text='File path')
    alert_days = models.IntegerField(default=30, help_text='Days before expiry to alert')

    def __str__(self):
        return f"{self.employee} — {self.name}"


class WorkSchedule(BaseModel):
    """Assigns an employee to a site location for a specific date and shift."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='work_schedules')
    date = models.DateField()
    shift_start = models.TimeField()
    shift_end = models.TimeField()
    location_name = models.CharField(max_length=200)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7)
    radius = models.IntegerField(default=200, help_text='Allowed clock-in radius in meters')

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.full_name} @ {self.location_name} on {self.date}"


class PublicHoliday(models.Model):
    """Singapore public holiday calendar (shared, not tenant-scoped)."""
    date = models.DateField(unique=True)
    name = models.CharField(max_length=100)
    year = models.IntegerField()

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.date} — {self.name}"


class ManpowerSettings(BaseModel):
    """Manpower module visibility settings per tenant."""
    ROLE_CHOICES = [
        ('director', 'Director'),
        ('manager', 'Manager'),
        ('senior_supervisor', 'Senior Supervisor'),
        ('supervisor', 'Supervisor'),
        ('technician', 'Technician'),
        ('helper', 'Helper'),
        ('staff', 'Staff'),
    ]

    # Role visibility: which roles to show on calendar
    show_directors = models.BooleanField(default=False)
    show_managers = models.BooleanField(default=False)
    show_senior_supervisors = models.BooleanField(default=True)
    show_supervisors = models.BooleanField(default=True)
    show_technicians = models.BooleanField(default=True)
    show_helpers = models.BooleanField(default=True)
    show_staff = models.BooleanField(default=True)

    # Feature toggles
    show_on_site_indicator = models.BooleanField(default=True, help_text='Show green glow for on-site staff')
    show_leave_status = models.BooleanField(default=True, help_text='Show leave status on calendar')
    show_unassigned = models.BooleanField(default=True, help_text='Show unassigned staff')
    show_teams = models.BooleanField(default=True, help_text='Show staff grouped by supervisor')

    class Meta:
        verbose_name = "Manpower Settings"
        verbose_name_plural = "Manpower Settings"

    def __str__(self):
        return f"Manpower Settings — {self.tenant}"
