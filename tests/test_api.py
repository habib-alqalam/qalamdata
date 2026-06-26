from fastapi.testclient import TestClient

from app.api.main import app


client = TestClient(app)


def test_health():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_analyze_parcel_contract():
    payload = {
        'parcel_id': '9140347',
        'is_registered': True,
        'is_free_hold': False,
        'building_density': 0.64,
        'transit_access_score': 0.72,
        'estimated_demand_index': 0.81,
    }
    response = client.post('/api/analyze-parcel', json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body['parcel_id'] == payload['parcel_id']
    assert isinstance(body['opportunity_score'], int)
    assert body['confidence'] in {'low', 'medium', 'high'}
    assert 'recommendation' in body
