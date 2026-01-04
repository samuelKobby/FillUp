import { supabase } from './supabase'

export const uploadStationImage = async (
  file: File,
  stationId: string
): Promise<string> => {
  try {
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${stationId}-${Date.now()}.${fileExt}`
    const filePath = `stations/${fileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('station-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('station-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

export const updateStationImage = async (
  stationId: string,
  imageUrl: string
): Promise<void> => {
  try {
    
    const { error } = await supabase
      .from('stations')
      .update({ image_url: imageUrl })
      .eq('id', stationId)

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

export const deleteStationImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/station-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('station-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

// Customer profile image functions
export const uploadCustomerImage = async (
  file: File,
  userId: string
): Promise<string> => {
  try {
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `customers/${fileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

export const updateCustomerImage = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl })
      .eq('id', userId)

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

export const deleteCustomerImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

// Vehicle image functions
export const uploadVehicleImage = async (
  file: File,
  vehicleId: string,
  userId: string
): Promise<string> => {
  try {
    
    // Generate unique filename with user ID in path
    const fileExt = file.name.split('.').pop()
    const fileName = `${vehicleId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/vehicles/${fileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

export const updateVehicleImage = async (
  vehicleId: string,
  imageUrl: string
): Promise<void> => {
  try {
    
    const { error } = await supabase
      .from('vehicles')
      .update({ image_url: imageUrl })
      .eq('id', vehicleId)

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

export const deleteVehicleImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

// Agent profile image functions
export const uploadAgentImage = async (
  file: File,
  userId: string
): Promise<string> => {
  try {
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `agents/${fileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

export const updateAgentImage = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl })
      .eq('id', userId)

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}

export const deleteAgentImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    throw error
  }
}
