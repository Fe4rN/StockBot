import os
from glob import glob 
from setuptools import find_packages, setup

package_name = 'stock_bot_nav_punto'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob(os.path.join('launch', '*launch.[pxy][yma]*'))),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='david',

    entry_points={
        'console_scripts': [
            'navigator = stock_bot_nav_punto.navigator:main',
        ],
    },
)