import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MapPin, Navigation } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface Location {
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
}

interface MapSectionProps {
  location: Location
  customerName: string
  loading?: boolean
}

const MapSection: React.FC<MapSectionProps> = ({ location, customerName, loading = false }) => {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    if (location.latitude && location.longitude) {
      setCoordinates([location.latitude, location.longitude])
    } else if (location.city && location.state) {
      // Geocode based on city and state
      geocodeAddress()
    }
  }, [location])

  const geocodeAddress = async () => {
    setGeocoding(true)
    try {
      // Using Nominatim (OpenStreetMap) for geocoding
      const query = [location.address, location.city, location.state, location.country]
        .filter(Boolean)
        .join(', ')

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)])
      } else {
        // Default to Malaysia center if geocoding fails
        setCoordinates([3.139003, 101.686855])
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      // Default to Malaysia center
      setCoordinates([3.139003, 101.686855])
    } finally {
      setGeocoding(false)
    }
  }

  const formatAddress = () => {
    const parts = [
      location.address,
      location.city,
      location.state,
      location.country
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(', ') : 'Address not available'
  }

  const openInMaps = () => {
    if (coordinates) {
      const url = `https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`
      window.open(url, '_blank')
    }
  }

  if (loading || geocoding) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-600" />
            Location
          </div>
          {coordinates && (
            <Button
              variant="outline"
              size="sm"
              onClick={openInMaps}
              className="gap-2"
            >
              <Navigation className="h-4 w-4" />
              Open in Maps
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Address Display */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-900">{customerName}</div>
              <div className="text-sm text-gray-600 mt-1">{formatAddress()}</div>
            </div>
          </div>
        </div>

        {/* Map */}
        {coordinates ? (
          <div className="h-64 rounded-lg overflow-hidden border">
            <MapContainer
              center={coordinates}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={coordinates}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{customerName}</div>
                    <div className="text-gray-600">{formatAddress()}</div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        ) : (
          <div className="h-64 rounded-lg border flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Location data not available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MapSection
