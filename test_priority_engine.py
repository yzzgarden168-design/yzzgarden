import unittest
from unittest.mock import patch
from production_server import OWN_COMPANY_ID, calculate_brand_diagnostic, calculate_priority, collect_brand_evidence, simulate_rag

class PriorityEngineTests(unittest.TestCase):
    def payload(self, **changes):
        data={"company_id":OWN_COMPANY_ID,"embedding_sim":.85,"intent_entity_score":40,"source_type":"official","source_age_months":3,"preferred_source":True,"field_completeness":35,"fact_consistency":25,"compliance":18,"non_redundancy":8,"brand_tier":"S","scene_type":"counter"}
        data.update(changes); return data
    def test_owner_boost_is_capped(self):
        self.assertEqual(calculate_priority(self.payload())["AppliedBoost"],1.5)
    def test_competitor_cannot_receive_brand_boost(self):
        self.assertEqual(calculate_priority(self.payload(company_id="competitor"))["BrandBoost"],0)
    def test_low_quality_disables_boosts(self):
        result=calculate_priority(self.payload(field_completeness=5,fact_consistency=5,compliance=5,non_redundancy=5))
        self.assertEqual((result["BrandBoost"],result["SceneBoost"]),(0,0))
    def test_reputation_circuit_breaker(self):
        result=calculate_priority(self.payload(negative_reputation=True))
        self.assertEqual((result["BrandBoost"],result["SceneBoost"]),(0,0))
    def test_geo_radius(self):
        result=calculate_priority(self.payload(user_lat=29.87,user_lon=121.55,company_lat=29.87,company_lon=121.55))
        self.assertEqual(result["GeoScore"],100)
    def test_top_three_enterprise_aggregation(self):
        chunks=[self.payload(chunk_id=str(i),embedding_sim=.95-i*.05) for i in range(4)]
        chunks.append(self.payload(company_id="weak",chunk_id="x",source_type="ugc",field_completeness=0,fact_consistency=0,compliance=0,non_redundancy=0))
        result=simulate_rag({"chunks":chunks,"brand_tier":"S","scene_type":"normal"})
        self.assertEqual(len(result["results"][0]["top_chunks"]),3)
        self.assertEqual(result["rejected_chunks"],1)
    def test_brand_diagnostic_is_bounded_and_explained(self):
        result=calculate_brand_diagnostic({"brand":"园之助","ai_tested":20,"ai_mentions":6,"ai_top3":2,"ai_citation":30,"ai_accuracy":80,"ecommerce_platforms":4,"store_rating":4.3,"review_positive":85,"product_consistency":75,"social_platforms":4,"monthly_mentions":80,"engagement_rate":3,"social_positive":70,"official_evidence":60})
        self.assertTrue(all(0 <= score <= 100 for score in result["scores"].values()))
        self.assertTrue(result["plan"])
        self.assertIn("不是任何平台",result["notice"])
    def test_brand_name_alone_does_not_create_weight(self):
        result=calculate_brand_diagnostic({"brand":"任意品牌"})
        self.assertEqual(result["scores"]["overall"],0)
    def test_verified_web_evidence_increases_confidence(self):
        low=calculate_brand_diagnostic({"brand":"任意品牌"})
        high=calculate_brand_diagnostic({"brand":"任意品牌","web_evidence":90})
        self.assertGreater(high["confidence"],low["confidence"])
    @patch("production_server.analyze_url")
    def test_brand_evidence_reports_reachable_and_matches(self, scan):
        scan.return_value={"url":"https://example.com","score":80,"scannedAt":"2026-10-13T00:00:00+08:00","metrics":{"title":"任意品牌官网","matchedKeywords":["任意品牌"]}}
        result=collect_brand_evidence({"brand":"任意品牌","urls":["https://example.com"]})
        self.assertEqual(result["summary"]["brand_matches"],1)
        self.assertEqual(result["summary"]["evidence_score"],92)

if __name__ == "__main__": unittest.main()
