from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("shopping", "0002_receiptdraft_raw_text_receiptdraft_suggestions")]
    operations = [
        migrations.RunSQL(
            f"ALTER TABLE {table} ADD CONSTRAINT {table}_image_size CHECK (octet_length(image) BETWEEN 1 AND 10485760 AND octet_length(preview) BETWEEN 1 AND 2097152)",
            f"ALTER TABLE {table} DROP CONSTRAINT {table}_image_size",
        )
        for table in ["shopping_receipt", "shopping_receiptdraft"]
    ]
