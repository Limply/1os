"""
One-time import command for Astronic employee list and course records.
Run: python manage.py import_astronic_employees
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from services.auth.models import Tenant
from services.hr.models import Employee, Certification
from services.organisation.models import Position, Department
import re

PASS_TYPE_MAP = {'W': 'wp', 'S': 'sp', 'E': 'ep'}

EMPLOYEES = [
    {"NO":1,"NAME":"Alam Kauchar","CONTACT":"9893 7754","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2025-07-05","FIN":"G2222473K","WP_NO":"0 63995746","APPIN":"2025-05-08","ISSUE":"2025-07-11","EXPIRY":"2026-06-10","SOC":"AIPL-PI-ES-102E-1-PEN00963-02","EMAIL":"Kaucharalam1@gmail.com"},
    {"NO":2,"NAME":"Ali Md Emon","CONTACT":"9468 5577","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2026-03-16","FIN":"M3334042N","WP_NO":"0 65530953","APPIN":"2026-02-12","ISSUE":"2026-03-30","EXPIRY":"2028-03-23","SOC":"03581-50549","EMAIL":"emonkhasn25@gmail.com"},
    {"NO":3,"NAME":"Ali Md Haydar","CONTACT":"9056 7589","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2015-03-23","FIN":"G8372285T","WP_NO":"0 62844663","APPIN":"2015-03-03","ISSUE":"2015-03-23","EXPIRY":"2027-10-24","SOC":"CSOC-WK015-02598","EMAIL":"alimdhaydar1984@gmail.com"},
    {"NO":4,"NAME":"Arzun","CONTACT":"8943 6143","WP":"W","POSITION":"Foremen","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2023-07-31","FIN":"G7311640L","WP_NO":"0 62013494","APPIN":"2023-06-15","ISSUE":"2023-08-04","EXPIRY":None,"SOC":"BCSS-100674","EMAIL":"arjundasarjundas802@gmail.com"},
    {"NO":5,"NAME":"Habib Md","CONTACT":"8172 1595","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2025-10-11","FIN":"G8141783R","WP_NO":"0 62560592","APPIN":"2025-10-07","ISSUE":"2025-10-15","EXPIRY":None,"SOC":"BCSS 107581","EMAIL":"Habib.bd906@gmail.com"},
    {"NO":6,"NAME":"Khan Md Sojal","CONTACT":"8653 5228","WP":"W","POSITION":"Construction Worker cum Driver","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2014-01-20","FIN":"G2197053R","WP_NO":"0 63872970","APPIN":"2014-01-02","ISSUE":"2017-12-08","EXPIRY":None,"SOC":"B-061116-03","EMAIL":"sojalkhan197918@gmail.com"},
    {"NO":7,"NAME":"Madbar Md Sagib","CONTACT":"8629 5481","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2025-10-21","FIN":"M4496315Q","WP_NO":"0 65772612","APPIN":"2025-09-22","ISSUE":"2025-10-25","EXPIRY":"2028-12-06","SOC":"THT-AWCS-242788","EMAIL":"ms2854490@gmail.com"},
    {"NO":8,"NAME":"Mollah Md Manik","CONTACT":"9897 3002","WP":"W","POSITION":"Foremen","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2011-05-18","FIN":"G7646831T","WP_NO":"0 62075287","APPIN":"2011-05-05","ISSUE":"2011-05-20","EXPIRY":None,"SOC":"FGE-WPH-WSH-3080-1.1-01587","EMAIL":"mdmanikmollah3@gmail.com"},
    {"NO":9,"NAME":"Opu","CONTACT":"8311 4880","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2019-08-17","FIN":"F8491548M","WP_NO":"0 61778284","APPIN":"2019-07-15","ISSUE":"2019-08-27","EXPIRY":"2027-08-14","SOC":"JA-AWSHCS-2023-1974","EMAIL":"oopu17542@gmail.com"},
    {"NO":10,"NAME":"Panneerselvam Agoramoorthy","CONTACT":"8629 3908","WP":"W","POSITION":"Project Engineer","NATIONALITY":"Indian","DATE COMMENCE":"2023-11-16","FIN":"M3361311X","WP_NO":"0 38615750","APPIN":"2023-10-10","ISSUE":"2023-11-21","EXPIRY":None,"SOC":"E01295(BL)-023673","EMAIL":"moorthy311x@gmail.com"},
    {"NO":11,"NAME":"Panneer Selvam Vinoth Babu","CONTACT":"8483 7211","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Indian","DATE COMMENCE":"2025-07-12","FIN":"G2306940M","WP_NO":"0 3600522-","APPIN":"2025-05-19","ISSUE":"2025-08-06","EXPIRY":None,"SOC":"AIPL-WP02-PR-303E-1-PEN000034-11","EMAIL":"babuselvam92@gmail.com"},
    {"NO":12,"NAME":"Rahat Sheikh","CONTACT":"9054 9030","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2019-11-12","FIN":"G8891536X","WP_NO":"0 65049740","APPIN":"2019-10-14","ISSUE":"2019-11-21","EXPIRY":None,"SOC":"LC-WD-WMCI-2025-12-582-17","EMAIL":"sheikhrahat061750@gmail.com"},
    {"NO":13,"NAME":"Rahim Md Abdur","CONTACT":"9865 6258","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2026-03-16","FIN":"M3360312J","WP_NO":"0 65582422","APPIN":"2026-02-23","ISSUE":"2026-03-30","EXPIRY":"2028-03-27","SOC":"03585-50603","EMAIL":"mdrohimkazi4@gmail.com"},
    {"NO":14,"NAME":"Saiyal Mohasin","CONTACT":"9899 4331","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2022-09-21","FIN":"G2816449T","WP_NO":"0 64736906","APPIN":"2022-08-19","ISSUE":"2022-10-05","EXPIRY":"2026-09-19","SOC":"01985-29278","EMAIL":"mohasinahmed7412@gmail.com"},
    {"NO":15,"NAME":"Sheikh Rubel","CONTACT":"8810 4617","WP":"W","POSITION":"Foremen","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2022-03-10","FIN":"G6817623P","WP_NO":"0 63393142","APPIN":"2021-03-08","ISSUE":"2022-03-11","EXPIRY":None,"SOC":"BCSS-100677","EMAIL":"rs7212128@gmail.com"},
    {"NO":16,"NAME":"Sheikh Sakib","CONTACT":"8590 9181","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2022-08-31","FIN":"M3118959K","WP_NO":"0 65294524","APPIN":"2022-07-22","ISSUE":"2022-10-25","EXPIRY":None,"SOC":"01888(BL)-35146","EMAIL":"sakibsheikh89111@gmail.com"},
    {"NO":17,"NAME":"Sheikh Yeasin","CONTACT":"8283 9319","WP":"W","POSITION":"Foremen","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2011-11-12","FIN":"G6963771Q","WP_NO":"0 6357712-","APPIN":"2011-10-13","ISSUE":"2011-11-11","EXPIRY":None,"SOC":"AIPL-WP02-PR-303E-1-EN000159-14","EMAIL":"yeasinsamir@gmail.com"},
    {"NO":18,"NAME":"Siam Mohammad","CONTACT":"8079 4293","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2019-06-18","FIN":"G8824019M","WP_NO":"0 64992910","APPIN":"2019-05-17","ISSUE":"2019-06-27","EXPIRY":"2027-05-23","SOC":"03191-45360","EMAIL":"Siam41299@gmail.com"},
    {"NO":19,"NAME":"Thirunavukkarasu Surendhiran","CONTACT":"8857 4215","WP":"W","POSITION":"Construction Worker","NATIONALITY":"Indian","DATE COMMENCE":"2022-09-12","FIN":"M3124116W","WP_NO":"0 38871412","APPIN":"2022-08-10","ISSUE":"2022-10-25","EXPIRY":None,"SOC":"01295(BL)-23677","EMAIL":"saisuren22@gmail.com"},
    {"NO":20,"NAME":"Liton Mohammad","CONTACT":"9111 0117","WP":"S","POSITION":"Senior Supervisor","NATIONALITY":"Bangladeshi","DATE COMMENCE":"2006-05-31","FIN":"F7938938L","WP_NO":"0 60887128","APPIN":"2026-01-09","ISSUE":"2026-02-01","EXPIRY":None,"SOC":"OSH-BCSS81/1486","EMAIL":"liton.ast@gmail.com"},
    {"NO":21,"NAME":"Wong Hui Lun Alain","CONTACT":None,"WP":None,"POSITION":None,"NATIONALITY":None,"DATE COMMENCE":None,"FIN":None,"WP_NO":None,"APPIN":None,"ISSUE":None,"EXPIRY":None,"SOC":None,"EMAIL":None},
    {"NO":22,"NAME":"Manik","CONTACT":None,"WP":None,"POSITION":None,"NATIONALITY":None,"DATE COMMENCE":None,"FIN":None,"WP_NO":None,"APPIN":None,"ISSUE":None,"EXPIRY":None,"SOC":None,"EMAIL":None},
    {"NO":23,"NAME":"Hasan Mehedi","CONTACT":None,"WP":None,"POSITION":None,"NATIONALITY":None,"DATE COMMENCE":None,"FIN":None,"WP_NO":None,"APPIN":None,"ISSUE":None,"EXPIRY":None,"SOC":None,"EMAIL":None},
    {"NO":24,"NAME":"Md Saiful Islam","CONTACT":None,"WP":None,"POSITION":None,"NATIONALITY":None,"DATE COMMENCE":None,"FIN":None,"WP_NO":None,"APPIN":None,"ISSUE":None,"EXPIRY":None,"SOC":None,"EMAIL":None},
]

COURSES = [
    {"NAME":"Alam Kauchar","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-07-09","SCH ID":20161075,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2026-06-10","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Electrical Work"},
    {"NAME":"Ali Md Emon","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":None,"SCH ID":None,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":None,"Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Ali Md Haydar","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2024-10-19","Otis SB NO.":"G2112003","SCH NO GO":"2026-07-24","SCH ID":20019978,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2027-10-24","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":"certified","Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Electrical Work"},
    {"NAME":"Arzun","Kone SIC":"2028-05-27","Kone Pass":"SP3748","Otis SIC":"2024-10-19","Otis SB NO.":"G2112005","SCH NO GO":"2026-05-13","SCH ID":20101097,"Fujitec SIC":"2024-10-24","SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":"2021-05-05","6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Electrical Work"},
    {"NAME":"Habib Md","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-11-05","SCH ID":20169804,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Lift Installation"},
    {"NAME":"Khan Md Sojal","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":"G2112013","SCH NO GO":"2026-07-24","SCH ID":547027,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":"certified","Fire Petroller":None,"Fire Watcher":None,"CPR+AED":"2022-09-16","First Aid Course":"2022-09-16","Operate Forklift":None,"Coretrade":"Structural Steel Works"},
    {"NAME":"Madbar Md Sagib","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-11-05","SCH ID":20169807,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2028-12-06","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":"certified","JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Mollah Md Manik","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2023-09-30","Otis SB NO.":"G2112018","SCH NO GO":"2027-03-29","SCH ID":547033,"Fujitec SIC":None,"SMO":"certified","BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":"certified","JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":"certified","Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":"2022-12-01","Fire Watcher":"certified","CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Lift Installation"},
    {"NAME":"Opu","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2024-10-19","Otis SB NO.":"G2112020","SCH NO GO":"2026-07-23","SCH ID":20090851,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2027-08-14","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":"certified","Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":"certified","Coretrade":"Cladding & Curtain Wall Installation"},
    {"NAME":"Panneerselvam Agoramoorthy","Kone SIC":"2028-05-27","Kone Pass":"SP3746","Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-07-23","SCH ID":20127011,"Fujitec SIC":"2024-10-24","SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":"2027-08-22","Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":"2026-11-24","First Aid Course":"2026-11-24","Operate Forklift":None,"Coretrade":None},
    {"NAME":"Panneer Selvam Vinoth Babu","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-07-30","SCH ID":20073985,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Rahat Sheikh","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2021-12-16","Otis SB NO.":"G2112021","SCH NO GO":"2026-07-23","SCH ID":20073987,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":"certified","Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Electrical Work"},
    {"NAME":"Rahim Md Abdur","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":None,"SCH ID":None,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":None,"Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Saiyal Mohasin","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2024-10-19","Otis SB NO.":None,"SCH NO GO":"2026-07-23","SCH ID":20054659,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2026-09-19","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":"certified","3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Sheikh Rubel","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2023-09-30","Otis SB NO.":None,"SCH NO GO":"2026-09-11","SCH ID":20063358,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":"certified","3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":"certified","Coretrade":"Electrical Works"},
    {"NAME":"Sheikh Sakib","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-05-13","SCH ID":20054485,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":"2026-12-08","Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Sheikh Yeasin","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2024-10-19","Otis SB NO.":"G2112025","SCH NO GO":"2026-06-05","SCH ID":20090854,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":"certified","JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":"SMAW","Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":"2022-09-16","Operate Forklift":None,"Coretrade":"Lift Installation"},
    {"NAME":"Siam Mohammad","Kone SIC":"2028-05-27","Kone Pass":"SP3749","Otis SIC":"2023-09-30","Otis SB NO.":"G2112027","SCH NO GO":"2027-01-07","SCH ID":581915,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"2027-05-23","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Thirunavukkarasu Surendhiran","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2024-10-19","Otis SB NO.":None,"SCH NO GO":"2026-07-23","SCH ID":20054486,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":"certified","Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Liton Mohammad","Kone SIC":None,"Kone Pass":None,"Otis SIC":"2021-12-16","Otis SB NO.":"G2112028","SCH NO GO":"2026-07-24","SCH ID":20090857,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":"certified","Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Lift Installation"},
    {"NAME":"Wong Hui Lun Alain","Kone SIC":"2025-07-05","Kone Pass":"SP3129","Otis SIC":"2023-09-30","Otis SB NO.":"G2112029","SCH NO GO":"2024-10-12","SCH ID":20090878,"Fujitec SIC":"2024-10-24","SMO":None,"BCSS/ CSOC":None,"Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Manik","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-07-02","SCH ID":20160961,"Fujitec SIC":None,"SMO":"certified","BCSS/ CSOC":"BCSS","Rigger & Signalman":"certified","Lifting Supervisor":"certified","Work At Height Sup/ Manager":"certified","Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":"certified","Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":"Lift Installation"},
    {"NAME":"Hasan Mehedi","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":"2026-07-02","SCH ID":20160962,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":"BCSS","Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
    {"NAME":"Md Saiful Islam","Kone SIC":None,"Kone Pass":None,"Otis SIC":None,"Otis SB NO.":None,"SCH NO GO":None,"SCH ID":20173375,"Fujitec SIC":None,"SMO":None,"BCSS/ CSOC":None,"Rigger & Signalman":None,"Lifting Supervisor":None,"Work At Height Sup/ Manager":None,"Work At Height Worker (WAHW)":None,"JTC Safety Induction":None,"Confined Space (Worker)":None,"6G Welder":None,"3G Welder":None,"Advance Certificate WSH":None,"Metal Scaffold Erection":None,"Fire Petroller":None,"Fire Watcher":None,"CPR+AED":None,"First Aid Course":None,"Operate Forklift":None,"Coretrade":None},
]


def parse_date(val):
    if not val or val in ('NA', '/', ''):
        return None
    try:
        from datetime import date
        parts = str(val).split('-')
        if len(parts) == 3:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
    except Exception:
        pass
    return None


def is_certified(val):
    """True if value indicates the cert exists (date or 'certified' marker)."""
    return val is not None and val not in ('NA', '', None)


def split_name(full_name):
    parts = full_name.strip().split(' ', 1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else ''
    return first, last


class Command(BaseCommand):
    help = 'Import Astronic employee list and course records'

    @transaction.atomic
    def handle(self, *args, **options):
        tenant = Tenant.objects.get(name__icontains='Astronic')
        self.stdout.write(f'Tenant: {tenant.name}')

        # Get or create department
        dept, _ = Department.objects.get_or_create(
            tenant=tenant, name='Work Team',
            defaults={'code': 'WT'}
        )

        # Cache positions
        position_cache = {}

        def get_position(title):
            if not title:
                return None
            if title not in position_cache:
                pos, _ = Position.objects.get_or_create(
                    tenant=tenant, title=title,
                    defaults={'department': dept}
                )
                position_cache[title] = pos
            return position_cache[title]

        # Import employees
        emp_map = {}  # name → Employee
        created = 0
        skipped = 0

        for e in EMPLOYEES:
            name = e['NAME']
            emp_no = f"AST{e['NO']:03d}"
            first, last = split_name(name)

            if Employee.objects.filter(tenant=tenant, emp_no=emp_no).exists():
                self.stdout.write(f'  SKIP (exists): {emp_no} {name}')
                emp_map[name] = Employee.objects.get(tenant=tenant, emp_no=emp_no)
                skipped += 1
                continue

            emp = Employee.objects.create(
                tenant=tenant,
                emp_no=emp_no,
                first_name=first,
                last_name=last,
                email=e['EMAIL'] or f'{emp_no.lower()}@astronic.com.sg',
                phone=e['CONTACT'],
                nationality=e['NATIONALITY'],
                nric=e['FIN'],
                pass_type=PASS_TYPE_MAP.get(e['WP'], 'wp') if e['WP'] else None,
                pass_expiry=parse_date(e['EXPIRY']),
                join_date=parse_date(e['DATE COMMENCE']) or __import__('datetime').date(2020, 1, 1),
                employment_type='fulltime',
                department=dept,
                position=get_position(e['POSITION']),
            )
            emp_map[name] = emp
            created += 1
            self.stdout.write(f'  + {emp_no} {name}')

        self.stdout.write(f'\nEmployees: {created} created, {skipped} skipped')

        # Import certifications
        cert_created = 0
        for c in COURSES:
            name = c['NAME']
            emp = emp_map.get(name)
            if not emp:
                self.stdout.write(f'  WARN: No employee for {name}')
                continue

            def add_cert(cert_name, expiry_val, issuer=None, cert_number=None):
                nonlocal cert_created
                if not is_certified(expiry_val):
                    return
                expiry = parse_date(expiry_val) if expiry_val not in ('certified', 'BCSS', 'SMAW') else None
                Certification.objects.get_or_create(
                    tenant=tenant, employee=emp, name=cert_name,
                    defaults={
                        'issuer': issuer,
                        'cert_number': str(cert_number) if cert_number else None,
                        'expiry_date': expiry,
                    }
                )
                cert_created += 1

            sch_id = str(c['SCH ID']) if c['SCH ID'] else None
            add_cert('Schindler Safety Course', c['SCH NO GO'], issuer='Schindler', cert_number=sch_id)
            add_cert('Kone Safety Induction Course', c['Kone SIC'], issuer='Kone', cert_number=c['Kone Pass'])
            add_cert('Otis Safety Induction Course', c['Otis SIC'], issuer='Otis', cert_number=c['Otis SB NO.'])
            add_cert('Fujitec Safety Induction Course', c['Fujitec SIC'], issuer='Fujitec')
            add_cert('SMO', c['SMO'])
            add_cert('BCSS/CSOC', c['BCSS/ CSOC'], issuer='BCSS')
            add_cert('Rigger & Signalman', c['Rigger & Signalman'])
            add_cert('Lifting Supervisor', c['Lifting Supervisor'])
            add_cert('Work At Height Supervisor/Manager', c['Work At Height Sup/ Manager'])
            add_cert('Work At Height Worker (WAHW)', c['Work At Height Worker (WAHW)'])
            add_cert('JTC Safety Induction', c['JTC Safety Induction'], issuer='JTC')
            add_cert('Confined Space (Worker)', c['Confined Space (Worker)'])
            add_cert('6G Welder', c['6G Welder'])
            add_cert('3G Welder', c['3G Welder'])
            add_cert('Advance Certificate for WSH', c['Advance Certificate WSH'])
            add_cert('Metal Scaffold Erection', c['Metal Scaffold Erection'])
            add_cert('Fire Patroller', c['Fire Petroller'])
            add_cert('Fire Watcher', c['Fire Watcher'])
            add_cert('CPR+AED', c['CPR+AED'])
            add_cert('First Aid Course', c['First Aid Course'])
            add_cert('Operate Forklift', c['Operate Forklift'])
            if c.get('Coretrade'):
                add_cert(f'Coretrade/Multiskill — {c["Coretrade"]}', 'certified')

        self.stdout.write(f'Certifications: {cert_created} created')
        self.stdout.write(self.style.SUCCESS('Import complete.'))
