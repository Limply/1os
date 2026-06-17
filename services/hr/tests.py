from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from services.auth.models import Tenant
from .models import Employee
from .serializers import EmployeeTreeSerializer

User = get_user_model()


def make_employee(emp_no, first, last, manager=None, is_active=True):
    return Employee.objects.create(
        emp_no=emp_no,
        first_name=first,
        last_name=last,
        email=f'{emp_no}@test.com',
        join_date=date.today(),
        manager=manager,
        is_active=is_active,
    )


class EmployeeModelTest(TestCase):
    def test_full_name(self):
        e = make_employee('E001', 'John', 'Doe')
        self.assertEqual(e.full_name, 'John Doe')

    def test_str(self):
        e = make_employee('E001', 'John', 'Doe')
        self.assertEqual(str(e), 'E001 — John Doe')

    def test_root_has_no_manager(self):
        root = make_employee('E001', 'Boss', 'Man')
        self.assertIsNone(root.manager)

    def test_subordinates_relationship(self):
        root = make_employee('E001', 'Boss', 'Man')
        sub = make_employee('E002', 'Worker', 'A', manager=root)
        self.assertIn(sub, root.subordinates.all())


class EmployeeTreeSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.root = make_employee('E001', 'Root', 'User')
        cls.child = make_employee('E002', 'Child', 'User', manager=cls.root)
        cls.inactive_child = make_employee('E003', 'Inactive', 'User', manager=cls.root, is_active=False)
        cls.grandchild = make_employee('E004', 'Grand', 'Child', manager=cls.child)

    def test_children_populated(self):
        data = EmployeeTreeSerializer(self.root).data
        self.assertEqual(len(data['children']), 1)
        self.assertEqual(data['children'][0]['emp_no'], 'E002')

    def test_inactive_children_excluded(self):
        data = EmployeeTreeSerializer(self.root).data
        emp_nos = [c['emp_no'] for c in data['children']]
        self.assertNotIn('E003', emp_nos)

    def test_direct_reports_count(self):
        data = EmployeeTreeSerializer(self.root).data
        self.assertEqual(data['direct_reports'], 1)

    def test_manager_name_for_child(self):
        data = EmployeeTreeSerializer(self.child).data
        self.assertEqual(data['manager_name'], 'Root User')

    def test_manager_name_none_for_root(self):
        data = EmployeeTreeSerializer(self.root).data
        self.assertIsNone(data['manager_name'])

    def test_photo_url_none_when_no_photo(self):
        data = EmployeeTreeSerializer(self.root).data
        self.assertIsNone(data['photo_url'])

    def test_nested_grandchild_present(self):
        data = EmployeeTreeSerializer(self.root).data
        child_node = data['children'][0]
        self.assertEqual(len(child_node['children']), 1)
        self.assertEqual(child_node['children'][0]['emp_no'], 'E004')


class OrgTreeAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        tenant = Tenant.objects.create(name='Test Co')
        self.user = User.objects.create_user(
            email='admin@test.com', password='pass', tenant=tenant
        )
        self.root = make_employee('E001', 'Root', 'User')

    def test_requires_auth(self):
        res = self.client.get('/api/hr/org-tree/')
        self.assertEqual(res.status_code, 401)

    def test_single_root_returns_root_node(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/hr/org-tree/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['emp_no'], 'E001')

    def test_multiple_roots_wraps_in_company(self):
        make_employee('E002', 'Second', 'Root')
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/hr/org-tree/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['id'])
        self.assertEqual(res.data['full_name'], 'Company')
        self.assertEqual(len(res.data['children']), 2)

    def test_inactive_employees_excluded_from_tree(self):
        make_employee('E002', 'Inactive', 'Root', is_active=False)
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/hr/org-tree/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['emp_no'], 'E001')

    def test_children_included_in_tree(self):
        make_employee('E002', 'Child', 'User', manager=self.root)
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/hr/org-tree/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['children']), 1)
        self.assertEqual(res.data['children'][0]['emp_no'], 'E002')
